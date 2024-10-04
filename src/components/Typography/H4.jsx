// H1.js
import React from 'react';
import PropTypes from 'prop-types';

const H4 = ({ children, className, style }) => {
  // Combine default styles with any custom className and style props
  const combinedClassName = `scroll-m-20 text-xl font-semibold tracking-tight ${className}`;
  const combinedStyle = { ...style };

  return (
    <h4 className={combinedClassName} style={combinedStyle}>
      {children}
    </h4>
  );
};

H4.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

H4.defaultProps = {
  className: '',
  style: {},
};

export default H4;
