// H1.js
import React from 'react';
import PropTypes from 'prop-types';

const H2 = ({ children, className, style }) => {
  // Combine default styles with any custom className and style props
  const combinedClassName = `scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 ${className}`;
  const combinedStyle = { ...style };

  return (
    <h2 className={combinedClassName} style={combinedStyle}>
      {children}
    </h2>
  );
};

H2.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

H2.defaultProps = {
  className: '',
  style: {},
};

export default H2;
