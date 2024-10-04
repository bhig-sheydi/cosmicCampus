// p.js
import React from 'react';
import PropTypes from 'prop-types';

const P = ({ children, className, style }) => {
  // Combine default styles with any custom className and style props
  const combinedClassName = `&:not(:first-child)]:mt-6 ${className}`;
  const combinedStyle = { ...style };

  return (
    <p className={combinedClassName} style={combinedStyle}>
      {children}
    </p>
  );
};

P.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

P.defaultProps = {
  className: '',
  style: {},
};

export default P;
