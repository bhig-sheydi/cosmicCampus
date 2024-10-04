import React from 'react';
import PropTypes from 'prop-types';

/**
 * Large component for displaying large, bold text.
 * 
 * @param {Object} props
 * @param {string} [props.className] - Optional additional CSS class names.
 * @param {React.CSSProperties} [props.style] - Optional inline styles.
 * 
 * @returns {JSX.Element}
 */
const Large = ({ children, className, style }) => {
  return (
    <div
      className={`text-lg font-semibold ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

// Define the types for props
Large.propTypes = {
  /**
   * The content to be displayed inside the div element.
   */
  children: PropTypes.node.isRequired,

  /**
   * Optional additional CSS class names to style the component.
   */
  className: PropTypes.string,

  /**
   * Optional inline styles to apply directly to the div element.
   */
  style: PropTypes.object,
};

// Default props values
Large.defaultProps = {
  className: '',
  style: {},
};

export default Large;
