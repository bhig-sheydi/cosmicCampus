import React from 'react';
import PropTypes from 'prop-types';

/**
 * Mute component for displaying muted text.
 * 
 * @param {Object} props
 * @param {string} [props.className] - Optional additional CSS class names.
 * @param {React.CSSProperties} [props.style] - Optional inline styles.
 * 
 * @returns {JSX.Element}
 */
const Mute = ({ children, className, style }) => {
  return (
    <p
      className={`text-sm text-muted-foreground ${className}`}
      style={style}
    >
      {children}
    </p>
  );
};

// Define the types for props
Mute.propTypes = {
  /**
   * The content to be displayed inside the paragraph element.
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
Mute.defaultProps = {
  className: '',
  style: {},
};

export default Mute;
