import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * InlineCode component for displaying inline code snippets with a copy-to-clipboard option.
 * 
 * @param {Object} props
 * @param {string} props.children - The code snippet to display.
 * @param {string} [props.className] - Optional additional CSS class names.
 * @param {React.CSSProperties} [props.style] - Optional inline styles.
 * 
 * @returns {JSX.Element}
 */
const InlineCode = ({ children, className, style }) => {
  const [isCopied, setIsCopied] = useState(false);

  // Function to handle the copy action
  const handleCopy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div
      className={`relative inline-flex items-center rounded bg-gray-200 px-2 py-1 font-mono text-sm font-semibold ${className}`}
      style={style}
      onClick={handleCopy}
    >
      <code>{children}</code>
      <button
        className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-opacity ${isCopied ? 'opacity-100' : 'opacity-0'}`}
        style={{ transition: 'opacity 0.3s ease' }}
        aria-label="Copy to clipboard"
      >
        {isCopied ? '✔️' : '📋'}
      </button>
    </div>
  );
};

// Define the types for props
InlineCode.propTypes = {
  /**
   * The code snippet to be displayed inside the inline code element.
   */
  children: PropTypes.string.isRequired,

  /**
   * Optional additional CSS class names to style the inline code.
   */
  className: PropTypes.string,

  /**
   * Optional inline styles to apply directly to the inline code element.
   */
  style: PropTypes.object,
};

// Default props values
InlineCode.defaultProps = {
  className: '',
  style: {},
};

export default InlineCode;
