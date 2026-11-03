// Отдельно от index.ts: тот тянет за собой все тексты тестов, а это нужно
// и в браузере, где тексты уже пришли с сервера.

/*
  Задание делится на ситуацию и вопрос к ней: на странице ситуация стоит
  карточкой публикации, а вопрос — рядом, над вариантами. Вопрос — последнее
  предложение со знаком вопроса, его в документе ставят в конце всегда.

  Если ситуация — это одна цитата с подводкой («В посте утверждается:
  «…».»), цитату показываем крупно, а подводку — мелко над ней.
*/
export type QuestionParts = {
  situation: string;
  question: string;
  lead: string | null;
  quote: string | null;
};

export function questionParts(text: string): QuestionParts {
  const split = text.match(/^([\s\S]*[.!»”"])\s+([^.!?]*\?)$/);
  if (!split) return { situation: "", question: text, lead: null, quote: null };
  const [, situation, question] = split;
  const quoted = situation.match(/^([^«“:]{0,60}:)\s*([«“][^»”]+[»”])\.?$/);
  return {
    situation,
    question,
    lead: quoted ? quoted[1] : null,
    quote: quoted ? quoted[2] : null,
  };
}
