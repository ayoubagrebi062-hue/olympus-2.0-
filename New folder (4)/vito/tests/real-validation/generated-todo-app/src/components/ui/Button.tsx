import React from 'react';

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  loading,
  disabled,
  onClick,
  children,
}) => {
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-300 hover:bg-gray-400 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-700 text-white',
  };

  const sizes = {
    sm: 'py-2 px-4 text-xs',
    md: 'py-2 px-6 text-sm',
    lg: 'py-3 px-8 text-lg',
  };

  const className = `
    ${variants[variant]}
    ${sizes[size]}
    transition duration-300 ease-in-out
    rounded
    flex items-center
    justify-center
    cursor-pointer
    disabled:opacity-50
    disabled:cursor-not-allowed
  `;

  if (loading) {
    return (
      <button
        disabled={true}
        className={className}
      >
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 border-4 border-gray-200 rounded-full border-t-gray-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        />
        Loading...
      </button>
    );
  }

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
};

export default Button;