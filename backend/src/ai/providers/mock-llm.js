import { parseContextBlocks } from '../prompts.js'
import {
  tokenize,
  splitSentences,
  fnv1a,
  seededShuffle,
  titleCase,
  truncate
} from '../mock/text.js'
import { extractJson } from '../../utils/json.js'

function buildCorpus(blocks) {
  const corpus = blocks.map((b) => ({
    index: b.index,
    documentName: b.label,
    pageNumber: b.pageNumber,
    sentences: splitSentences(b.content)
  }))
  return corpus.filter((c) => c.sentences.length > 0)
}

function termStats(corpus) {
  const tf = new Map()
  const df = new Map()
  for (const src of corpus) {
    const seen = new Set()
    for (const s of src.sentences) {
      for (const t of tokenize(s)) {
        tf.set(t, (tf.get(t) ?? 0) + 1)
        seen.add(t)
      }
    }
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1)
  }
  return { tf, df }
}

function scoreSentence(sentence, queryTerms, df, totalSources) {
  const tokens = tokenize(sentence)
  const counts = new Map()
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1)
  let score = 0
  let distinct = 0
  for (const qt of queryTerms) {
    const c = counts.get(qt)
    if (!c) continue
    distinct += 1
    const idf = 1 + 2 / (1 + (df.get(qt) ?? 1))
    score += c * idf
  }
  if (distinct >= 2) score *= 1.35
  return score * (1 + distinct / Math.max(1, totalSources))
}

const DEF_RE = /^(?:the\s+)?([A-Za-z][A-Za-z0-9\s\-']{2,60}?)\s+(?:is|are|refers to|means|is defined as|can be defined as)\s+(.{25,400})$/i

function extractDefinitions(sentences) {
  const defs = []
  for (const s of sentences) {
    const clean = s.replace(/^\s*[-•*\d.)]+\s*/, '').trim()
    const m = clean.match(DEF_RE)
    if (m && !/[?]/.test(clean)) {
      defs.push({ term: m[1].trim(), definition: m[2].trim(), sentence: clean })
    }
  }
  return defs
}

function pickTopSentences(queryText, corpus, df, maxPerSource, limit) {
  const queryTerms = tokenize(queryText)
  if (queryTerms.length === 0) return []
  const scored = []
  for (const src of corpus) {
    for (const s of src.sentences) {
      const score = scoreSentence(s, queryTerms, df, corpus.length)
      if (score > 0) scored.push({ source: src, sentence: s, score })
    }
  }
  scored.sort((a, b) => b.score - a.score)
  const perSourceCount = new Map()
  const picked = []
  for (const item of scored) {
    const used = perSourceCount.get(item.source.index) ?? 0
    if (used >= maxPerSource) continue
    perSourceCount.set(item.source.index, used + 1)
    picked.push(item)
    if (picked.length >= limit) break
  }
  return picked
}

function chatAnswer(userMessage, corpus, df) {
  const picks = pickTopSentences(userMessage, corpus, df, 2, 4)
  if (picks.length === 0) {
    const { tf } = termStats(corpus)
    const topics = [...tf.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => titleCase(t))
    const topicLine = topics.length ? ` Your notes cover topics like: ${topics.join(', ')}.` : ''
    return `I couldn't find information about that in your uploaded material.${topicLine}\n\nTry rephrasing the question, or upload a document that covers this topic. I only answer from your own documents so that every claim is verifiable.`
  }

  const lines = [`Based on your study material:`, ``]
  for (const p of picks) {
    lines.push(`- ${truncate(p.sentence, 320)} [${p.source.index}]`)
  }
  lines.push(``)
  lines.push(`_Answer extracted from ${new Set(picks.map((p) => p.source.documentName)).size} source location(s). Open the citations below to verify each point._`)
  return lines.join('\n')
}

function summaryObject(corpus, df, tf) {
  const allDefs = corpus.flatMap((src) =>
    extractDefinitions(src.sentences).map((d) => ({ ...d, index: src.index }))
  )
  const topTerms = [...tf.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => titleCase(t))

  const ranked = pickTopSentences(topTerms.join(' '), corpus, df, 3, 5)
  const overview = ranked.map((r) => truncate(r.sentence, 260)).join(' ') || 'This document could not be summarized automatically.'

  const formulaRe = /[=×÷∑∫√]|\bformula\b|\blaw\b|\brule\b/i
  const formulas = corpus
    .flatMap((s) => s.sentences)
    .filter((s) => formulaRe.test(s))
    .slice(0, 4)

  const examHintRe = /\b(important|remember|note that|key|exam|must|always|never|definition)\b/i
  const examPoints = corpus
    .flatMap((s) => s.sentences)
    .filter((s) => examHintRe.test(s))
    .slice(0, 4)

  const t1 = topTerms[0] ?? 'this material'
  const t2 = topTerms[1] ?? 'the main concept'
  const suggestedQuestions = [
    `Explain ${t1} in simple words`,
    `What is the difference between ${t1} and ${t2}?`,
    `Give a real-world example of ${t1}`,
    `Which points about ${t1} are most likely to be examined?`
  ]

  return {
    overview,
    keyConcepts: topTerms.slice(0, 6),
    definitions: allDefs.slice(0, 6).map((d) => ({ term: d.term, definition: truncate(d.definition, 240) })),
    formulas: formulas.map((f) => truncate(f, 200)),
    examPoints: examPoints.map((e) => truncate(e, 220)),
    suggestedQuestions
  }
}

function quizObject(userPrompt, corpus, df, tf) {
  let params = { count: 5, difficulty: 'MEDIUM', topic: null }
  const pm = userPrompt.match(/PARAMS:\s*(\{.*\})/)
  if (pm) {
    try {
      params = { ...params, ...JSON.parse(pm[1]) }
    } catch {
      // eslint-disable-next-line no-unused-vars
    }
  }

  const seed = fnv1a(corpus.map((c) => c.sentences[0]).join('|').slice(0, 500))
  const defs = seededShuffle(
    corpus.flatMap((src) => extractDefinitions(src.sentences).map((d) => ({ ...d, index: src.index }))),
    seed
  )
  const topTerms = [...tf.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => titleCase(t))

  const questions = []

  for (const d of defs) {
    if (questions.length >= params.count) break
    const others = defs.filter((x) => x.term.toLowerCase() !== d.term.toLowerCase())
    if (others.length < 3) break
    const distractors = seededShuffle(others, seed + questions.length + 7).slice(0, 3)
    const options = seededShuffle(
      [
        truncate(d.definition, 160),
        ...distractors.map((x) => truncate(x.definition, 160))
      ],
      seed + questions.length + 13
    )
    questions.push({
      question: `According to your material, what best describes "${d.term}"?`,
      options,
      correctIndex: options.indexOf(truncate(d.definition, 160)),
      explanation: `Your notes state that ${d.term} ${truncate(d.definition, 220)} [${d.index}]`,
      topic: params.topic || titleCase(d.term.split(/\s+/).slice(-1)[0]),
      difficulty: params.difficulty,
      sourcePage: corpus.find((c) => c.index === d.index)?.pageNumber ?? null,
      sourceQuote: truncate(d.sentence, 180)
    })
  }

  for (const src of corpus) {
    if (questions.length >= params.count) break
    for (const s of src.sentences) {
      if (questions.length >= params.count) break
      const present = topTerms.filter((t) => new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i').test(s))
      if (present.length !== 1) continue
      const term = present[0]
      if (questions.some((q) => q.question.includes(term))) continue
      const blanked = s.replace(new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i'), '________')
      const distractors = topTerms.filter((t) => t !== term).slice(0, 3)
      if (distractors.length < 3 || blanked === s) continue
      const options = seededShuffle([term, ...distractors], seed + questions.length + 29)
      questions.push({
        question: `Fill in the blank: ${truncate(blanked, 280)}`,
        options,
        correctIndex: options.indexOf(term),
        explanation: `"${truncate(s, 240)}" [${src.index}]`,
        topic: params.topic || term,
        difficulty: 'EASY',
        sourcePage: src.pageNumber,
        sourceQuote: truncate(s, 180)
      })
    }
  }

  if (questions.length < params.count) {
    const allSentences = corpus.flatMap((src) =>
      src.sentences.map((s) => ({ sentence: s, src }))
    ).filter((item) => item.sentence.length >= 25)

    const shuffled = seededShuffle(allSentences, seed + 99)
    for (const { sentence, src } of shuffled) {
      if (questions.length >= params.count) break
      const words = tokenize(sentence).filter((w) => w.length > 3)
      if (words.length < 1) continue
      
      const keyWord = titleCase(words[0])
      if (questions.some((q) => q.question.includes(truncate(sentence, 50)))) continue
      
      const otherWords = seededShuffle(topTerms.concat(['Data', 'System', 'Process', 'Network', 'Model', 'Function', 'Protocol', 'Analysis']).filter((w) => w.toLowerCase() !== keyWord.toLowerCase()), seed + questions.length + 50)
      const distractors = [...new Set(otherWords)].slice(0, 3)
      while (distractors.length < 3) distractors.push(`Option ${distractors.length + 1}`)
      
      const options = seededShuffle([keyWord, ...distractors], seed + questions.length + 70)
      questions.push({
        question: `Which key concept from page ${src.pageNumber} relates to: "${truncate(sentence, 150)}"?`,
        options,
        correctIndex: options.indexOf(keyWord),
        explanation: `Refers to: "${truncate(sentence, 200)}" [${src.index}]`,
        topic: params.topic || keyWord || 'General',
        difficulty: params.difficulty,
        sourcePage: src.pageNumber,
        sourceQuote: truncate(sentence, 180)
      })
    }
  }

  if (questions.length === 0) {
    throw new Error('Mock quiz generator found no testable content in the provided excerpts')
  }

  const firstDoc = corpus[0]?.documentName?.replace(/\.pdf$/i, '') ?? 'Study Material'
  return {
    title: `${params.topic ? titleCase(params.topic) : firstDoc} Quiz`,
    questions: questions.slice(0, params.count)
  }
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function generate(messages) {
  const system = messages.find((m) => m.role === 'system')?.content ?? ''
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const fullText = messages.map((m) => m.content).join('\n')
  const blocks = parseContextBlocks(fullText)
  if (blocks.length === 0) {
    return JSON.stringify({ error: 'no context available' })
  }
  const corpus = buildCorpus(blocks)
  const { tf, df } = termStats(corpus)

  if (system.includes('TASK: QUIZ')) {
    return JSON.stringify(quizObject(lastUser, corpus, df, tf))
  }
  if (system.includes('TASK: SUMMARY')) {
    return JSON.stringify(summaryObject(corpus, df, tf))
  }
  return chatAnswer(lastUser, corpus, df)
}

export const mockLLMProvider = {
  name: 'offline-extractive',
  isMock: true,

  async complete(opts) {
    return generate(opts.messages)
  },

  async *completeStream(opts) {
    const full = await generate(opts.messages)
    const words = full.split(/(\s+)/)
    let chunk = ''
    for (const w of words) {
      chunk += w
      if (chunk.length >= 12) {
        yield chunk
        chunk = ''
        await new Promise((r) => setTimeout(r, 15))
      }
    }
    if (chunk) yield chunk
  }
}
