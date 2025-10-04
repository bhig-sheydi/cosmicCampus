import React, { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import H1 from '../Typography/H1'
import H2 from '../Typography/H2'
import P from '../Typography/P'
import { motion, AnimatePresence } from 'framer-motion'

const FAQs = () => {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      question: 'What tools does Cosmic Campus provide to support educational administration?',
      answer: 'Cosmic Campus offers a range of tools designed to streamline educational administration, including attendance tracking, easy payment options for school fees, and systems for checking results and rankings, making management simpler for both staff,  students and guardians.'
    },
    {
      question: 'What services does Cosmic Campus offer?',
      answer: 'We provide essential services such as attendance management, fee payment facilitation, and easy access to results and rankings, helping schools efficiently manage their operations while enhancing the experience for students and staff.'
    },
    {
      question: 'How can Cosmic Campus improve the efficiency of school management?',
      answer: 'Our platform simplifies administrative tasks by automating attendance tracking and fee payments, allowing staff to focus more on educational activities rather than paperwork. This efficiency leads to a smoother operational flow within educational institutions.'
    },
    {
      question: 'Why should schools choose Cosmic Campus for their administrative needs?',
      answer: 'Cosmic Campus is dedicated to enhancing school administration through user-friendly interfaces and reliable technology. Our commitment to providing streamlined solutions helps educational institutions operate more efficiently and effectively.'
    },
    {
      question: 'How does Cosmic Campus ensure the accuracy of attendance and results?',
      answer: 'We employ robust data management practices and real-time updates to ensure that attendance records and results are accurate and up-to-date, providing schools with reliable information for decision-making.'
    },
    {
      question: 'What makes your fee payment system effective?',
      answer: 'Our fee payment system is designed for ease of use, allowing parents and guardians to make payments quickly and securely online, reducing administrative burdens for school staff and ensuring timely collection of fees.'
    },
    {
      question: 'Can parents access their child’s attendance and results easily?',
      answer: 'Yes! Cosmic Campus allows parents to easily access their child’s attendance records and academic results through a secure online portal, fostering transparency and communication between schools and families.'
    },
    {
      question: 'What age groups does Cosmic Campus cater to?',
      answer: 'Cosmic Campus is designed to support educational institutions catering to various age groups, from primary to secondary education, ensuring that all students benefit from our administrative tools.'
    },
    {
      question: 'How can schools enroll in Cosmic Campus services?',
      answer: 'Schools interested in our services Should click on get started or contact our team at Walking Universe enterprise.'
    },
    {
      question: 'How does Cosmic Campus ensure data security for users?',
      answer: 'We prioritize the security of user data through stringent security measures, including encryption and access controls, ensuring that all sensitive information is protected while maintaining privacy and confidentiality.'
    }
  ]

  const toggleFAQ = (index) => setOpenIndex(openIndex === index ? null : index)

  return (
    <section className="w-full bg-white py-20">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="text-center mb-10">
          <H1 className="text-3xl md:text-4xl font-semibold">Frequently Asked Questions</H1>
          <H2 className="text-lg text-slate-600 mt-2">Everything you need to know about Cosmic Campus</H2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, idx) => (
            <motion.article
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03 }}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden"
            >
              <div className="p-6">
                <button
                  className="w-full flex items-start justify-between gap-4"
                  onClick={() => toggleFAQ(idx)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFAQ(idx) }}
                  aria-expanded={openIndex === idx}
                  aria-controls={`faq-${idx}`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <span className="bg-purple-50 text-purple-600 rounded-full p-2">
                      <HelpCircle className="w-5 h-5" />
                    </span>
                    <h3 className="text-base md:text-lg font-medium text-slate-900 dark:text-white">{faq.question}</h3>
                  </div>

                  <div className="ml-4 mt-1">
                    {openIndex === idx ? <ChevronUp className="w-5 h-5 text-purple-500" /> : <ChevronDown className="w-5 h-5 text-purple-500" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {openIndex === idx && (
                    <motion.div
                      id={`faq-${idx}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28 }}
                      className="mt-4 text-slate-700 dark:text-slate-300 overflow-hidden"
                    >
                      <P>{faq.answer}</P>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQs
