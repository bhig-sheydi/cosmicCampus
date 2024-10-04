// H1.js
import React from 'react';
import PropTypes from 'prop-types';

const H3 = ({ children, className, style }) => {
  // Combine default styles with any custom className and style props
  const combinedClassName = `scroll-m-20 text-2xl font-semibold tracking-tight${className}`;
  const combinedStyle = { ...style };

  return (
    <h3 className={combinedClassName} style={combinedStyle}>
      {children}
    </h3>
  );
};

H3.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

H3.defaultProps = {
  className: '',
  style: {},
};

export default H3;
