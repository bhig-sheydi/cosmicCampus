import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import H1 from '../Typography/H1';
import H2 from '../Typography/H2';
import H3 from '../Typography/H3';
import P from '../Typography/P';
import { motion, AnimatePresence } from 'framer-motion';

const FAQs = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    
      {
        "question": "What tools does Cosmic Campus provide to support educational administration?",
        "answer": "Cosmic Campus offers a range of tools designed to streamline educational administration, including attendance tracking, easy payment options for school fees, and systems for checking results and rankings, making management simpler for both staff,  students and guardians."
      },
      {
        "question": "What services does Cosmic Campus offer?",
        "answer": "We provide essential services such as attendance management, fee payment facilitation, and easy access to results and rankings, helping schools efficiently manage their operations while enhancing the experience for students and staff."
      },
      {
        "question": "How can Cosmic Campus improve the efficiency of school management?",
        "answer": "Our platform simplifies administrative tasks by automating attendance tracking and fee payments, allowing staff to focus more on educational activities rather than paperwork. This efficiency leads to a smoother operational flow within educational institutions."
      },
      {
        "question": "Why should schools choose Cosmic Campus for their administrative needs?",
        "answer": "Cosmic Campus is dedicated to enhancing school administration through user-friendly interfaces and reliable technology. Our commitment to providing streamlined solutions helps educational institutions operate more efficiently and effectively."
      },
      {
        "question": "How does Cosmic Campus ensure the accuracy of attendance and results?",
        "answer": "We employ robust data management practices and real-time updates to ensure that attendance records and results are accurate and up-to-date, providing schools with reliable information for decision-making."
      },
      {
        "question": "What makes your fee payment system effective?",
        "answer": "Our fee payment system is designed for ease of use, allowing parents and guardians to make payments quickly and securely online, reducing administrative burdens for school staff and ensuring timely collection of fees."
      },
      {
        "question": "Can parents access their child’s attendance and results easily?",
        "answer": "Yes! Cosmic Campus allows parents to easily access their child’s attendance records and academic results through a secure online portal, fostering transparency and communication between schools and families."
      },
      {
        "question": "What age groups does Cosmic Campus cater to?",
        "answer": "Cosmic Campus is designed to support educational institutions catering to various age groups, from primary to secondary education, ensuring that all students benefit from our administrative tools."
      },
      {
        "question": "How can schools enroll in Cosmic Campus services?",
        "answer": "Schools interested in our services Should click on get started or contact our team at Walking Universe enterprise."
      },
      {
        "question": "How does Cosmic Campus ensure data security for users?",
        "answer": "We prioritize the security of user data through stringent security measures, including encryption and access controls, ensuring that all sensitive information is protected while maintaining privacy and confidentiality."
      }
    
    
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full p-8 bg-gradient-to-b from-white via-blue-50 to-pink-100 dark:from-gray-800 dark:via-purple-800 dark:to-pink-900">
      <div className="text-center mt-16">
        <H1 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
          Frequently Asked Questions
        </H1>
        <H2 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
          Everything You Need to Know
        </H2>
      </div>

      <div className="mt-8 space-y-4">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 cursor-pointer"
            onClick={() => toggleFAQ(index)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <HelpCircle className="text-purple-500" />
                <H3 className="text-lg font-semibold">{faq.question}</H3>
              </div>
              <div>
                {openIndex === index ? <ChevronUp className="text-purple-500" /> : <ChevronDown className="text-purple-500" />}
              </div>
            </div>
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 text-base text-gray-700 dark:text-gray-300 overflow-hidden"
                >
                  <P>{faq.answer}</P>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FAQs;
