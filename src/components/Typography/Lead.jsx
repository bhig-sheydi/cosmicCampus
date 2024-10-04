import React from 'react';
import PropTypes from 'prop-types';

/**
 * TypographyLead component for displaying lead text with specific styling.
 * 
 * @param {Object} props
 * @param {string} [props.className] - Optional additional CSS class names.
 * @param {React.CSSProperties} [props.style] - Optional inline styles.
 * 
 * @returns {JSX.Element}
 */
const Lead = ({ children, className, style }) => {
  return (
    <p
      className={`text-xl text-muted-foreground ${className}`}
      style={style}
    >
      {children}
    </p>
  );
};

// Define the types for props
Lead.propTypes = {
  /**
   * Content to be displayed inside the paragraph element.
   */
  children: PropTypes.node.isRequired,

  /**
   * Optional additional CSS class names to style the component.
   */
  className: PropTypes.string,

  /**
   * Optional inline styles to apply directly to the paragraph element.
   */
  style: PropTypes.object,
};

// Default props values
Lead.defaultProps = {
  className: '',
  style: {},
};

export default Lead;
