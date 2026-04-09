import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconX } from '@tabler/icons-react';

interface Props {
  value: [Date | string | null, Date | string | null];
  onChange: (value: [Date | string | null, Date | string | null]) => void;
}

export function DateRangeFilter({ value, onChange }: Props) {
  const hasValue = value[0] !== null || value[1] !== null;

  return (
    <Group gap="xs" align="flex-end">
      <DatePickerInput
        type="range"
        label="Період"
        placeholder="Оберіть діапазон дат"
        value={value}
        onChange={onChange}
        clearable
        w={280}
        valueFormat="DD.MM.YYYY"
        locale="uk"
      />
      {hasValue && (
        <Tooltip label="Скинути фільтр" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            mb={1}
            onClick={() => onChange([null, null])}
          >
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
