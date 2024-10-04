import React from 'react';
import PropTypes from 'prop-types';

const Q = ({ children, className, style }) => {
  // Combine default styles with any custom className and style props
  const combinedClassName = `mt-6 border-l-2 pl-6 italic ${className}`;
  const combinedStyle = { ...style };

  return (
    <blockquote className={combinedClassName} style={combinedStyle}>
      {children}
    </blockquote>
  );
};

Q.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

Q.defaultProps = {
  className: '',
  style: {},
};

export default Q;
