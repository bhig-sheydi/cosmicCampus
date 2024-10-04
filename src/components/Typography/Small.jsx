import React from 'react';
import PropTypes from 'prop-types';

/**
 * Small component for displaying small, medium-weight text.
 * 
 * @param {Object} props
 * @param {string} [props.className] - Optional additional CSS class names.
 * @param {React.CSSProperties} [props.style] - Optional inline styles.
 * 
 * @returns {JSX.Element}
 */
const Small = ({ children, className, style }) => {
  return (
    <small
      className={`text-sm font-medium leading-none ${className}`}
      style={style}
    >
      {children}
    </small>
  );
};

// Define the types for props
Small.propTypes = {
  /**
   * The content to be displayed inside the small element.
   */
  children: PropTypes.node.isRequired,

  /**
   * Optional additional CSS class names to style the component.
   */
  className: PropTypes.string,

  /**
   * Optional inline styles to apply directly to the small element.
   */
  style: PropTypes.object,
};

// Default props values
Small.defaultProps = {
  className: '',
  style: {},
};

export default Small;
