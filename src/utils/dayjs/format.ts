import dayjs from 'dayjs';

const stringByFields = {
  last_used: 'Not yet used',
  default: 'default',
};

export const formatDateToString = (date: Date | string, format: string): string => dayjs(date).format(format);
export const usedFieldString = (date: Date | string, field: keyof typeof stringByFields): string => {
  const isInclude = date.toString().includes('0001');
  if (isInclude) {
    return stringByFields[field];
  }

  return stringByFields.default;
};
