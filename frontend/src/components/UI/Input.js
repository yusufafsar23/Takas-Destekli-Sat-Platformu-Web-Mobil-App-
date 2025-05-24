import React from 'react';
import { Form } from 'react-bootstrap';
import PropTypes from 'prop-types';

const Input = ({
  type = 'text',
  placeholder,
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  className = '',
  as = 'input',
  rows = 3,
}) => {
  return (
    <Form.Group className="mb-3">
      {label && (
        <Form.Label>
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </Form.Label>
      )}
      <Form.Control
        type={type}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
        isInvalid={!!error}
        disabled={disabled}
        className={className}
        as={as}
        rows={as === 'textarea' ? rows : undefined}
        required={required}
      />
      {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
    </Form.Group>
  );
};

Input.propTypes = {
  type: PropTypes.string,
  placeholder: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  as: PropTypes.string,
  rows: PropTypes.number,
};

export default Input; 