import React from 'react';
import { Button as BootstrapButton } from 'react-bootstrap';
import PropTypes from 'prop-types';

const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  onClick, 
  children, 
  disabled = false,
  className = '',
  type = 'button',
  block = false,
  as,
  to,
  ...rest
}) => {
  return (
    <BootstrapButton
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={`${className} ${block ? 'w-100' : ''}`}
      type={type}
      as={as}
      to={to}
      {...rest}
    >
      {children}
    </BootstrapButton>
  );
};

Button.propTypes = {
  variant: PropTypes.string,
  size: PropTypes.string,
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  type: PropTypes.string,
  block: PropTypes.bool,
  as: PropTypes.elementType,
  to: PropTypes.string
};

export default Button; 