// H1.js
import React from 'react';
import PropTypes from 'prop-types';

const H1 = ({ children, className, style }) => {
  // Combine default styles with any custom className and style props
  const combinedClassName = `scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl ${className}`;
  const combinedStyle = { ...style };

  return (
    <h1 className={combinedClassName} style={combinedStyle}>
      {children}
    </h1>
  );
};

H1.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

H1.defaultProps = {
  className: '',
  style: {},
};

export default H1;
