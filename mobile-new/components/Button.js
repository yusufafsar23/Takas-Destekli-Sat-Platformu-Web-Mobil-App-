import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

/**
 * Özel Button Komponenti
 * @param {string} text - Buton üzerindeki metin
 * @param {function} onPress - Tıklama işlevi
 * @param {boolean} isLoading - Yükleniyor durumu
 * @param {string} type - Buton tipi (primary, secondary, danger)
 * @param {object} style - Ek stil
 * @param {boolean} disabled - Devre dışı durumu
 */
export const Button = ({
  text,
  onPress,
  isLoading = false,
  type = 'primary',
  style = {},
  disabled = false,
  ...props
}) => {
  const getButtonStyle = () => {
    switch (type) {
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'danger':
        return styles.dangerButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'outline':
        return styles.outlineButtonText;
      default:
        return styles.buttonText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={type === 'outline' ? '#FF6B6B' : '#fff'}
          size="small"
        />
      ) : (
        <Text style={[getTextStyle(), disabled && styles.disabledText]}>
          {text}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
  },
  secondaryButton: {
    backgroundColor: '#4169E1',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  dangerButton: {
    backgroundColor: '#E53935',
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
    borderColor: '#BDBDBD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#757575',
  },
}); 