import { Link } from 'react-router-dom'
import { Sparkles, Upload, MessageSquare, Brain, BookOpen, BarChart3, Target, ArrowRight, CheckCircle, FileText } from 'lucide-react'

const FEATURES = [
  { icon: Upload, title: 'Smart Document Processing', desc: 'Upload PDFs and study notes. Our system extracts, cleans, and chunks content while preserving page-level references.' },
  { icon: MessageSquare, title: 'RAG-Powered AI Tutor', desc: 'Ask questions and receive answers grounded in your own documents — never generic or hallucinated responses.' },
  { icon: Target, title: 'Page-Level Citations', desc: 'Every AI answer shows exactly which document and page it came from, so you can verify every claim.' },
  { icon: Brain, title: 'AI Quiz Generation', desc: 'Generate structured multiple-choice quizzes from your material at any difficulty level.' },
  { icon: BarChart3, title: 'Performance Analytics', desc: 'Track your accuracy across topics, spot weak areas, and watch your improvement over time.' },
  { icon: BookOpen, title: 'Personalized Recommendations', desc: 'Get explainable suggestions on what to revise next based on your actual quiz performance.' }
]

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur-md border-b border-surface-200 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-accent-violet flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900">StudyForge AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">Sign in</Link>
            <Link to="/signup" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 transition">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> Built for real learning
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
            Turn your study material into your personal<br />
            <span className="text-gradient">AI tutor</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your notes, ask questions, generate quizzes, and discover what you need to revise —
            with answers grounded in your own material, complete with source citations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-primary-600 text-white px-7 py-3.5 rounded-xl font-semibold text-base hover:bg-primary-700 transition shadow-lg shadow-primary-600/20">
              Start Learning <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 text-slate-600 px-6 py-3.5 rounded-xl font-medium hover:bg-surface-50 transition">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Product Preview Card */}
      <section className="px-4 pb-16 -mt-2">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-surface-200 shadow-xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Documents', value: '12', sub: 'Uploaded & indexed', color: 'from-blue-500 to-cyan-400' },
                { label: 'Questions Asked', value: '87', sub: 'Across 8 conversations', color: 'from-primary-500 to-violet-500' },
                { label: 'Quiz Score', value: '82%', sub: 'Last 5 attempts', color: 'from-emerald-500 to-teal-400' }
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-surface-50 rounded-xl p-4 border border-surface-200">
                  <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                  <p className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-1">{sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-1">What is the difference between supervised and unsupervised learning?</p>
                  <p className="text-sm text-slate-600 leading-relaxed">Based on your study material: <strong className="text-slate-900">Supervised learning</strong> uses labeled training data where each example includes an input and its desired output [1]. <strong className="text-slate-900">Unsupervised learning</strong> works with unlabeled data and finds hidden patterns [1].</p>
                  <div className="mt-2 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500">Source: Introduction to Machine Learning — Lecture Notes.pdf, Page 1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-white border-y border-surface-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center text-slate-900 mb-3">How It Works</h2>
          <p className="text-slate-600 text-center max-w-xl mx-auto mb-14">Four steps from raw PDF to personalized learning plan</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Upload', desc: 'Upload your lecture notes, textbook chapters, or study PDFs.', icon: Upload },
              { step: '02', title: 'Index', desc: 'Content is extracted, chunked, and embedded into a searchable knowledge base.', icon: Brain },
              { step: '03', title: 'Ask & Quiz', desc: 'Chat with your material and generate quizzes to test your understanding.', icon: MessageSquare },
              { step: '04', title: 'Improve', desc: 'Track performance, spot weak topics, and get personalized revision plans.', icon: BarChart3 }
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">Step {step}</span>
                <h3 className="font-display font-semibold text-slate-900 mt-1 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center text-slate-900 mb-3">Built for Real Learning</h2>
          <p className="text-slate-600 text-center max-w-xl mx-auto mb-14">Not a ChatGPT wrapper — a complete evidence-backed study workflow</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 hover:shadow-card-hover transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RAG Section */}
      <section className="py-20 px-4 bg-white border-y border-surface-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">Grounded in Your Documents</h2>
          <p className="text-slate-600 max-w-xl mx-auto mb-8">
            Every answer includes source citations showing the exact document and page number.
            You never have to wonder if the AI is making things up.
          </p>
          <div className="bg-surface-50 rounded-2xl p-6 border border-surface-200 text-left">
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-white rounded-xl p-4 border border-surface-200">
                <CheckCircle className="w-5 h-5 text-accent-emerald mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Source citation example:</p>
                  <div className="mt-1 flex items-center gap-2 bg-surface-50 rounded-lg px-3 py-2 border border-surface-200">
                    <FileText className="w-4 h-4 text-primary-500" />
                    <span className="text-sm text-slate-700">Introduction to Machine Learning — Lecture Notes.pdf</span>
                    <span className="text-xs text-slate-400">Page 2</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white rounded-xl p-4 border border-surface-200">
                <CheckCircle className="w-5 h-5 text-accent-emerald mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-700"><strong>Retrieval:</strong> Your question is embedded and matched against document chunks using vector similarity (or keyword search in offline mode).</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white rounded-xl p-4 border border-surface-200">
                <CheckCircle className="w-5 h-5 text-accent-emerald mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-700"><strong>Answer:</strong> The AI is explicitly instructed to only use retrieved context and cite sources inline with [1], [2] markers.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">Ready to study smarter?</h2>
          <p className="text-slate-600 mb-8">
            StudyForge works best with your own material. Upload your first document and see the difference grounded AI makes.
          </p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary-700 transition shadow-lg shadow-primary-600/20">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-slate-600">StudyForge AI</span>
          </div>
          <p className="text-xs text-slate-400">Hackathon Project — Generative AI for Productivity</p>
        </div>
      </footer>
    </div>
  )
}
