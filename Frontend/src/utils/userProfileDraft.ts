export const saveBeforePublishing = async <TInput, TResult>(
  input: TInput,
  save: (value: TInput) => Promise<unknown>,
  publish: () => Promise<TResult>,
) => {
  await save(input);
  return publish();
};
