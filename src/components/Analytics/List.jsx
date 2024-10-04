import React from 'react';
import PropTypes from 'prop-types';

const List = ({ items, className, listType = 'disc' }) => {
  const listClassName = `my-6 ml-6 list-${listType} ${className}`;

  return (
    <ul className={listClassName}>
      {items.map((item, index) => (
        <li key={index} className="mt-2">
          {item}
        </li>
      ))}
    </ul>
  );
};

List.propTypes = {
  items: PropTypes.arrayOf(PropTypes.node).isRequired,
  className: PropTypes.string,
  listType: PropTypes.oneOf(['disc', 'decimal', 'circle', 'square', 'none']),
};

List.defaultProps = {
  className: '',
  listType: 'disc',
};

export default List;
