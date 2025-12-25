import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const AuthInput = ({
  type = 'text',
  label,
  error,
  showPasswordToggle = false,
  icon: Icon,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = showPasswordToggle
    ? (showPassword ? 'text' : 'password')
    : type;

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-text-main text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
        )}
        <input
          type={inputType}
          className={`w-full px-4 py-3 bg-surface border rounded-xl text-text-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
            Icon ? 'pl-11' : ''
          } ${
            showPasswordToggle ? 'pr-11' : ''
          } ${
            error ? 'border-error' : 'border-white/10'
          }`}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-error text-sm mt-1">{error}</p>
      )}
    </div>
  );
};

export default AuthInput;
