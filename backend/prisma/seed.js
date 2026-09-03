import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SAMPLE_TEXT = `
Introduction to Machine Learning — Lecture Notes

1. What is Machine Learning?
Machine learning is a subset of artificial intelligence that enables systems to learn from data and improve their performance on tasks without being explicitly programmed. The core idea is to identify patterns in data and use those patterns to make predictions or decisions.

2. Supervised Learning
Supervised learning uses labeled training data, where each example includes an input and its corresponding desired output. The algorithm learns a mapping function from inputs to outputs. Common supervised learning algorithms include linear regression, logistic regression, decision trees, random forests, and support vector machines. The goal is to generalize from training data to unseen examples.

3. Unsupervised Learning
Unsupervised learning works with unlabeled data. The algorithm tries to find hidden patterns or groupings in the data. K-means clustering, hierarchical clustering, and principal component analysis (PCA) are popular unsupervised methods. These techniques are useful for customer segmentation, anomaly detection, and dimensionality reduction.

4. Gradient Descent
Gradient descent is an optimization algorithm used to minimize a cost function. It works by iteratively adjusting parameters in the direction of steepest descent of the cost function. The learning rate controls how large each step is. Too large a learning rate may overshoot the minimum; too small a learning rate leads to slow convergence. Variants include batch gradient descent, stochastic gradient descent (SGD), and mini-batch gradient descent.

5. Overfitting and Underfitting
Overfitting occurs when a model learns noise in the training data rather than the underlying pattern, leading to poor generalization on new data. Techniques to prevent overfitting include regularization (L1 and L2), cross-validation, dropout, and early stopping. Underfitting happens when a model is too simple to capture the underlying structure of the data, resulting in low accuracy on both training and test data.

6. Decision Trees
A decision tree is a supervised learning algorithm that splits data based on feature values to create a tree-like structure of decisions. Each internal node represents a feature test, each branch represents the outcome, and each leaf node represents a class label or regression value. Decision trees are easy to interpret but prone to overfitting. Random forests improve upon decision trees by combining multiple trees to reduce variance.

7. Neural Networks
Neural networks are inspired by biological neurons. A basic neural network consists of an input layer, one or more hidden layers, and an output layer. Each connection has a weight that is adjusted during training using backpropagation. Deep learning uses neural networks with many hidden layers to learn hierarchical representations. Common architectures include convolutional neural networks (CNNs) for images and recurrent neural networks (RNNs) for sequential data.

8. Model Evaluation
Model evaluation metrics include accuracy, precision, recall, F1-score, and AUC-ROC. Accuracy measures the proportion of correct predictions. Precision measures how many predicted positives are actually positive. Recall measures how many actual positives are correctly identified. The F1-score is the harmonic mean of precision and recall. Cross-validation provides a more robust estimate of model performance by training and evaluating on multiple splits of the data.
`

const DEMO_EMAIL = 'demo@studyforge.ai'
const DEMO_PASSWORD = 'demo1234'

async function main() {
  // eslint-disable-next-line no-console
  console.log('Seeding database...')

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: 'Demo Student',
      passwordHash
    }
  })
  // eslint-disable-next-line no-console
  console.log(`  User: ${user.email} (id: ${user.id})`)

  const doc = await prisma.document.upsert({
    where: { id: 'seed-ml-notes' },
    update: {},
    create: {
      id: 'seed-ml-notes',
      userId: user.id,
      name: 'Introduction to Machine Learning — Lecture Notes.pdf',
      fileUrl: '/seed/ml-notes.pdf',
      fileType: 'application/pdf',
      fileSize: 128000,
      status: 'READY',
      pageCount: 4
    }
  })

  const existingChunks = await prisma.documentChunk.count({ where: { documentId: doc.id } })
  if (existingChunks === 0) {
    const sections = SAMPLE_TEXT.split(/\n\n/).filter((s) => s.trim().length > 0)
    const pageMapped = [
      { page: 1, chunks: sections.slice(0, 2) },
      { page: 2, chunks: sections.slice(2, 4) },
      { page: 3, chunks: sections.slice(4, 6) },
      { page: 4, chunks: sections.slice(6, 8) }
    ]

    let idx = 0
    for (const { page, chunks: chunks } of pageMapped) {
      for (const content of chunks) {
        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk" ("id", "documentId", "content", "pageNumber", "chunkIndex", "metadata")
          VALUES (${`chunk-${idx}`}, ${doc.id}, ${content.trim()}, ${page}, ${idx}, ${JSON.stringify({ seeded: true })}::jsonb)
        `
        idx++
      }
    }
    // eslint-disable-next-line no-console
    console.log(`  Document chunks: ${idx}`)
  }

  const quiz = await prisma.quiz.upsert({
    where: { id: 'seed-quiz-1' },
    update: {},
    create: {
      id: 'seed-quiz-1',
      userId: user.id,
      documentId: doc.id,
      title: 'Machine Learning Basics Quiz',
      difficulty: 'MEDIUM'
    }
  })

  const qCount = await prisma.question.count({ where: { quizId: quiz.id } })
  if (qCount === 0) {
    const questions = [
      {
        question: 'What does supervised learning use?',
        options: ['Labeled data', 'Unlabeled data', 'No data', 'Random data'],
        correctIndex: 0,
        explanation: 'Supervised learning uses labeled training data where each example has an input and its corresponding desired output.',
        topic: 'Supervised Learning',
        sourcePage: 1
      },
      {
        question: 'What is gradient descent used for?',
        options: ['Classifying data', 'Minimizing a cost function', 'Clustering', 'Data visualization'],
        correctIndex: 1,
        explanation: 'Gradient descent is an optimization algorithm used to minimize a cost function by iteratively adjusting parameters.',
        topic: 'Gradient Descent',
        sourcePage: 2
      },
      {
        question: 'What prevents overfitting?',
        options: ['More training data', 'Regularization and dropout', 'Larger models', 'More features'],
        correctIndex: 1,
        explanation: 'Regularization (L1/L2), dropout, cross-validation, and early stopping help prevent overfitting.',
        topic: 'Overfitting',
        sourcePage: 3
      },
      {
        question: 'What are neural networks inspired by?',
        options: ['Mathematical equations', 'Biological neurons', 'Computer circuits', 'Statistical models'],
        correctIndex: 1,
        explanation: 'Neural networks are inspired by biological neurons in the brain.',
        topic: 'Neural Networks',
        sourcePage: 4
      },
      {
        question: 'What does the F1-score measure?',
        options: ['Accuracy only', 'Precision only', 'Harmonic mean of precision and recall', 'Recall only'],
        correctIndex: 2,
        explanation: 'The F1-score is the harmonic mean of precision and recall, providing a balanced measure of both.',
        topic: 'Model Evaluation',
        sourcePage: 4
      }
    ]

    for (let i = 0; i < questions.length; i++) {
      await prisma.question.create({
        data: {
          quizId: quiz.id,
          order: i + 1,
          ...questions[i],
          difficulty: 'MEDIUM',
          sourceQuote: questions[i].explanation.slice(0, 200)
        }
      })
    }
    // eslint-disable-next-line no-console
    console.log(`  Quiz questions: ${questions.length}`)
  }

  const attemptCount = await prisma.quizAttempt.count({ where: { userId: user.id } })
  if (attemptCount === 0) {
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: user.id,
        score: 4,
        totalQuestions: 5,
        percentage: 80,
        durationSeconds: 120
      }
    })

    const questions = await prisma.question.findMany({ where: { quizId: quiz.id }, orderBy: { order: 'asc' } })
    for (const q of questions) {
      await prisma.quizAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId: q.id,
          selectedIndex: q.correctIndex,
          isCorrect: true
        }
      })
    }

    // Second attempt with some wrong answers
    const attempt2 = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: user.id,
        score: 3,
        totalQuestions: 5,
        percentage: 60,
        durationSeconds: 95
      }
    })
    for (const q of questions) {
      const isWrong = q.order === 2 || q.order === 4
      await prisma.quizAnswer.create({
        data: {
          attemptId: attempt2.id,
          questionId: q.id,
          selectedIndex: isWrong ? (q.correctIndex + 1) % 4 : q.correctIndex,
          isCorrect: !isWrong
        }
      })
    }
    // eslint-disable-next-line no-console
    console.log('  Quiz attempts: 2')
  }

  // Create topic progress
  const topics = ['Supervised Learning', 'Gradient Descent', 'Overfitting', 'Neural Networks', 'Model Evaluation']
  for (const topicName of topics) {
    const normalizedName = topicName.toLowerCase()
    const topic = await prisma.topic.upsert({
      where: { userId_normalizedName: { userId: user.id, normalizedName } },
      update: {},
      create: { userId: user.id, name: topicName, normalizedName }
    })

    const correct = topicName === 'Neural Networks' ? 1 : topicName === 'Model Evaluation' ? 2 : 3
    const total = 4

    await prisma.userTopicProgress.upsert({
      where: { userId_topicId: { userId: user.id, topicId: topic.id } },
      update: { correct, total, accuracy: Math.round((correct / total) * 100), lastPracticedAt: new Date() },
      create: { userId: user.id, topicId: topic.id, correct, total, accuracy: Math.round((correct / total) * 100), lastPracticedAt: new Date() }
    })
  }
  // eslint-disable-next-line no-console
  console.log('  Topic progress: 5 topics')

  // Create a sample conversation
  const conv = await prisma.conversation.upsert({
    where: { id: 'seed-conv-1' },
    update: {},
    create: {
      id: 'seed-conv-1',
      userId: user.id,
      title: 'What is supervised learning?'
    }
  })

  const msgCount = await prisma.message.count({ where: { conversationId: conv.id } })
  if (msgCount === 0) {
    await prisma.message.create({
      data: { conversationId: conv.id, role: 'USER', content: 'What is supervised learning and how does it differ from unsupervised learning?' }
    })
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        role: 'ASSISTANT',
        content: 'Based on your study material:\n\n**Supervised learning** uses labeled training data where each example includes an input and its desired output. The algorithm learns a mapping function. Common algorithms include linear regression, decision trees, and support vector machines [1].\n\n**Unsupervised learning** works with unlabeled data and tries to find hidden patterns or groupings. K-means clustering and PCA are popular methods [1].\n\nThe key difference is that supervised learning has labeled answers to learn from, while unsupervised learning must discover structure on its own.',
        citations: {
          items: [{
            documentId: doc.id,
            documentName: 'Introduction to Machine Learning — Lecture Notes.pdf',
            pageNumber: 1,
            relevantExcerpt: 'Supervised learning uses labeled training data...'
          }]
        }
      }
    })
    // eslint-disable-next-line no-console
    console.log('  Conversation: 1 with 2 messages')
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete!')
  // eslint-disable-next-line no-console
  console.log(`\nDemo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
