import { notFound } from "next/navigation";

/*
  «Проверь себя» временно снят с сайта: пункт меню убран, все страницы
  раздела отдают 404. Тесты, вопросы из панели и сама панель остаются.
  Чтобы вернуть раздел — удалить этот файл и вернуть пункт в Header.tsx.
*/
export default function QuizLayout(): never {
  notFound();
}
