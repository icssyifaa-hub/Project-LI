// lib/color.ts

export const colorClasses = {
  blue: {
    text: 'text-blue-800',
    border: 'border-blue-300',
    lightBg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
    ring: 'ring-blue-200',
    solid: 'bg-blue-500',
    solidHover: 'hover:bg-blue-600',
  },
  green: {
    text: 'text-green-800',
    border: 'border-green-300',
    lightBg: 'bg-green-50',
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
    ring: 'ring-green-200',
    solid: 'bg-green-500',
    solidHover: 'hover:bg-green-600',
  },
  purple: {
    text: 'text-purple-800',
    border: 'border-purple-300',
    lightBg: 'bg-purple-50',
    badge: 'bg-purple-100 text-purple-800',
    dot: 'bg-purple-500',
    ring: 'ring-purple-200',
    solid: 'bg-purple-500',
    solidHover: 'hover:bg-purple-600',
  },
  teal: {
    text: 'text-teal-800',
    border: 'border-teal-300',
    lightBg: 'bg-teal-50',
    badge: 'bg-teal-100 text-teal-800',
    dot: 'bg-teal-500',
    ring: 'ring-teal-200',
    solid: 'bg-teal-500',
    solidHover: 'hover:bg-teal-600',
  },
  yellow: {
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    lightBg: 'bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800',
    dot: 'bg-yellow-500',
    ring: 'ring-yellow-200',
    solid: 'bg-yellow-600',
    solidHover: 'hover:bg-yellow-700',
  },
  pink: {
    text: 'text-pink-800',
    border: 'border-pink-300',
    lightBg: 'bg-pink-50',
    badge: 'bg-pink-100 text-pink-800',
    dot: 'bg-pink-500',
    ring: 'ring-pink-200',
    solid: 'bg-pink-500',
    solidHover: 'hover:bg-pink-600',
  },
  indigo: {
    text: 'text-indigo-800',
    border: 'border-indigo-300',
    lightBg: 'bg-indigo-50',
    badge: 'bg-indigo-100 text-indigo-800',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-200',
    solid: 'bg-indigo-500',
    solidHover: 'hover:bg-indigo-600',
  },
  orange: {
    text: 'text-orange-800',
    border: 'border-orange-300',
    lightBg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-800',
    dot: 'bg-orange-500',
    ring: 'ring-orange-200',
    solid: 'bg-orange-500',
    solidHover: 'hover:bg-orange-600',
  },
  cyan: {
    text: 'text-cyan-800',
    border: 'border-cyan-300',
    lightBg: 'bg-cyan-50',
    badge: 'bg-cyan-100 text-cyan-800',
    dot: 'bg-cyan-500',
    ring: 'ring-cyan-200',
    solid: 'bg-cyan-500',
    solidHover: 'hover:bg-cyan-600',
  },
  red: {
    text: 'text-red-800',
    border: 'border-red-300',
    lightBg: 'bg-red-50',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
    ring: 'ring-red-200',
    solid: 'bg-red-500',
    solidHover: 'hover:bg-red-600',
  },
  rose: {
    text: 'text-rose-800',
    border: 'border-rose-300',
    lightBg: 'bg-rose-50',
    badge: 'bg-rose-100 text-rose-800',
    dot: 'bg-rose-500',
    ring: 'ring-rose-200',
    solid: 'bg-rose-500',
    solidHover: 'hover:bg-rose-600',
  },
  brown: {
    text: 'text-amber-800',
    border: 'border-amber-300',
    lightBg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-800',
    ring: 'ring-amber-200',
    solid: 'bg-amber-800',
    solidHover: 'hover:bg-amber-900',
  },
  lime: {
    text: 'text-lime-800',
    border: 'border-lime-300',
    lightBg: 'bg-lime-50',
    badge: 'bg-lime-100 text-lime-800',
    dot: 'bg-lime-500',
    ring: 'ring-lime-200',
    solid: 'bg-lime-500',
    solidHover: 'hover:bg-lime-700',
  },
  gray: {
    text: 'text-gray-800',
    border: 'border-gray-300',
    lightBg: 'bg-gray-50',
    badge: 'bg-gray-100 text-gray-800',
    dot: 'bg-gray-500',
    ring: 'ring-gray-200',
    solid: 'bg-gray-500',
    solidHover: 'hover:bg-gray-600',
  },
  peach: {
    text: 'text-orange-800',
    border: 'border-orange-300',
    lightBg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-800',
    dot: 'bg-orange-500',
    ring: 'ring-orange-200',
    solid: 'bg-orange-500',
    solidHover: 'hover:bg-orange-600',
  },
};

export type ColorKey = keyof typeof colorClasses;
export type ColorType = keyof typeof colorClasses.blue;

export const getColorClass = (color: string | undefined | null, type: ColorType): string => {
  if (!color) return colorClasses.blue[type];
  const colorKey = color as ColorKey;
  return colorClasses[colorKey]?.[type] || colorClasses.blue[type];
};

export const getItemStyleClasses = (color: string | undefined | null): string => {
  const safeColor = color || 'blue';
  return `${getColorClass(safeColor, 'solid')} text-black dark:text-white ${getColorClass(safeColor, 'solidHover')} shadow-sm`;
};

export const getItemBgClass = (color: string | undefined | null): string => {
  return getColorClass(color, 'lightBg');
};

export const getBadgeClass = (color: string | undefined | null): string => {
  return getColorClass(color, 'badge');
};

export const getDotClass = (color: string | undefined | null): string => {
  return getColorClass(color, 'dot');
};

export const getSolidClass = (color: string | undefined | null): string => {
  return getColorClass(color, 'solid');
};
