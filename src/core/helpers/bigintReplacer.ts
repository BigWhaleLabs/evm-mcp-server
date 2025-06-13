// eslint-disable-next-line @typescript-eslint/no-redeclare
export default function bigintReplacer(key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString()
  } else {
    return value
  }
}
