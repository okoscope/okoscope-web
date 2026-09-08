import type { Locale } from '.'

/** Dictionary-backed compatibility boundary for existing JSX surfaces. */
export const legacyRussian: Record<string, string> = {
  'Comparison provenance mismatch': 'Несоответствие источника сравнения',
  'Baseline selection': 'Выбор базового релиза',
  'Deployment episodes': 'Эпизоды развёртывания',
  Episode: 'Эпизод',
  'Kubernetes revision': 'Ревизия Kubernetes',
  'First Ready': 'Первая готовность',
  Ended: 'Завершён',
  Pods: 'Поды',
  'Ready Pods': 'Готовые поды',
  of: 'из',
  'workload Ready Pods': 'готовых подов workload',
  'Ready Pod share': 'Доля готовых подов',
  'Readiness snapshot': 'Снимок готовности',
  'Ready Pod share is the share of Ready Pods in this observation. It is not traffic share and does not confirm canary or A/B deployment intent.':
    'Доля готовых подов относится только к готовым подам в этом наблюдении. Это не доля трафика и не подтверждение canary- или A/B-развёртывания.',
  'Image identity digest': 'Дайджест идентификатора образа',
  'Kubernetes revisions': 'Ревизии Kubernetes',
  'Active episodes': 'Активные эпизоды',
  'Image identity components': 'Компоненты идентификатора образа',
  'Image identity components unavailable.': 'Компоненты идентификатора образа недоступны.',
  'Deployment episode history': 'История эпизодов развёртывания',
  'A Release is immutable. Kubernetes revisions and repeated deployment episodes are shown as separate observed evidence.':
    'Release неизменяем. Ревизии Kubernetes и повторные эпизоды развёртывания показаны как отдельные наблюдаемые свидетельства.',
  'Loading deployment episodes…': 'Загрузка эпизодов развёртывания…',
  'Deployment episodes unavailable': 'Эпизоды развёртывания недоступны',
  'Episode ownership mismatch': 'Несоответствие области эпизода',
  'The response does not belong to this Release.': 'Ответ не относится к этому Release.',
  'No deployment episodes': 'Нет эпизодов развёртывания',
  'No Kubernetes deployment episodes are available for this Release.':
    'Для этого Release нет доступных эпизодов развёртывания Kubernetes.',
  'Loading managed runtime policies…': 'Загрузка управляемых политик…',
  'Managed runtime policies unavailable': 'Управляемые политики недоступны',
  'Managed policies': 'Управляемые политики',
  'Application intent': 'Ожидаемое поведение приложения',
  'Managed runtime policies': 'Управляемые политики среды выполнения',
  'Policies classify observed behavior. They do not change discovery lifecycle or delete evidence.':
    'Политики классифицируют наблюдаемое поведение, не меняя жизненный цикл и факты.',
  Policies: 'Политики',
  'No policies yet. Create one from a Runtime Group or inventory observation.':
    'Политик пока нет. Создайте политику из наблюдения.',
  '· revision': '· ревизия',
  'Revision history': 'История ревизий',
  'Inside scope': 'В области действия',
  'Outside scope': 'Вне области действия',
  'Loading revision history…': 'Загрузка истории ревизий…',
  'Suppression history': 'История подавлений',
  'Suppressed observation': 'Подавленное наблюдение',
  'Open source observation': 'Открыть исходное наблюдение',
  Scope: 'Область действия',
  Active: 'Активно',
  Expired: 'Истекло',
  'No suppressions recorded.': 'Подавления не зарегистрированы.',
  expires: 'истекает',
  '· expires': '· истекает',
  'Cancel suppression': 'Отменить подавление',
  'Policy state': 'Состояние политики',
  'Classify expected behavior, review policy revisions, and manage temporary suppressions.':
    'Классифицируйте ожидаемое поведение, ревизии и временные подавления.',
  'Expected by policy': 'Ожидается политикой',
  'Temporarily suppressed': 'Временно подавлено',
  'Evaluating policy': 'Политика вычисляется',
  'Suppressed until': 'Подавлено до',
  'Policy state filters': 'Фильтры состояния политики',
  'Policy verdict': 'Вердикт политики',
  'Any verdict': 'Любой вердикт',
  Unclassified: 'Не классифицировано',
  'Requires review': 'Требует проверки',
  'Policy conflict': 'Конфликт политик',
  Suppression: 'Подавление',
  'Not suppressed': 'Не подавлено',
  Suppressed: 'Подавлено',
  Evaluation: 'Вычисление',
  Current: 'Актуально',
  'Create policy from observation': 'Создать политику из наблюдения',
  'Temporarily suppress': 'Временно подавить',
  'Temporarily suppress observation': 'Временно подавить наблюдение',
  'Manage policies': 'Управление политиками',
  'Policy seed unavailable': 'Источник политики недоступен',
  'Observed facts and discovery lifecycle remain unchanged.':
    'Наблюдаемые факты и жизненный цикл не изменятся.',
  'This observation cannot seed a policy:': 'Из этого наблюдения нельзя создать политику:',
  'Policy name': 'Название политики',
  'Scope:': 'Область действия:',
  'All application placements': 'Все размещения приложения',
  'Policy preview': 'Предпросмотр политики',
  'Preview at': 'Предпросмотр на',
  'groups and': 'групп и',
  'sightings affected;': 'наблюдений затронуто;',
  'expected,': 'ожидаемых,',
  'require review.': 'требуют проверки.',
  'Policy command failed': 'Команда политики завершилась ошибкой',
  'Preview impact': 'Предпросмотр влияния',
  'Create policy': 'Создать политику',
  'Preview is required before creation.': 'Перед созданием требуется предпросмотр.',
  Reason: 'Причина',
  'Expires at': 'Истекает',
  '. Maximum duration is 90 days.': '. Максимальный срок — 90 дней.',
  'Suppression failed': 'Не удалось создать подавление',
  'Create suppression': 'Создать подавление',
  Language: 'Язык',
  English: 'Английский',
  Russian: 'Русский',
  Primary: 'Основная навигация',
  'End session': 'Завершить сеанс',
  'Compatible API · v1': 'Совместимый API · v1',
  'Connect to Okoscope': 'Подключиться к Okoscope',
  "Your bearer credential stays in this page's memory and disappears on reload.":
    'Токен доступа хранится только в памяти этой страницы и исчезнет после перезагрузки.',
  'Bearer credential': 'Токен доступа',
  'Start session': 'Начать сеанс',
  'Checking backend compatibility…': 'Проверяем совместимость сервера…',
  'Backend unavailable': 'Сервер недоступен',
  'Incompatible deployment': 'Несовместимое развертывание',
  'Incompatible backend': 'Несовместимый сервер',
  Expected: 'Ожидается',
  Actual: 'Фактически',
  Service: 'Сервис',
  Commit: 'Коммит',
  'Required migration': 'Требуемая миграция',
  'Actual migration': 'Фактическая миграция',
  'or newer': 'или новее',
  unknown: 'неизвестно',
  'Page not found': 'Страница не найдена',
  'Not found': 'Не найдено',
  'Configuration error': 'Ошибка конфигурации',
  'Okoscope cannot start': 'Не удалось запустить Okoscope',
  'Runtime configuration could not be loaded.':
    'Не удалось загрузить конфигурацию среды выполнения.',
  'Loading…': 'Загрузка…',
  'Never observed': 'Никогда не наблюдалось',
  Close: 'Закрыть',
  'Something went wrong': 'Что-то пошло не так',
  'An unexpected error occurred.': 'Произошла непредвиденная ошибка.',
  'Error code:': 'Код ошибки:',
  'Request ID:': 'ID запроса:',
  'Try again': 'Повторить',
  Organization: 'Организация',
  Project: 'Проект',
  Projects: 'Проекты',
  Application: 'Приложение',
  Applications: 'Приложения',
  Notifications: 'Уведомления',
  'Configure notifications': 'Настроить уведомления',
  Configuration: 'Конфигурация',
  Diagnostics: 'Диагностика',
  Releases: 'Релизы',
  'Runtime groups': 'Группы среды выполнения',
  'Runtime Groups': 'Группы среды выполнения',
  'Runtime Group': 'Группа среды выполнения',
  'Runtime Inventory': 'Инвентаризация среды выполнения',
  'Runtime inventory': 'Инвентаризация среды выполнения',
  'Runtime Diff': 'Различия среды выполнения',
  'Application Activity': 'Активность приложения',
  Recommendations: 'Рекомендации',
  'Processes, connections, and domains observed in this application.':
    'Процессы, подключения и домены, наблюдаемые в этом приложении.',
  'Coming soon: suggested actions based on observed activity.':
    'Скоро: рекомендуемые действия на основе наблюдаемой активности.',
  'Process launches': 'Запуски процессов',
  'Network activity': 'Сетевая активность',
  Connections: 'Подключения',
  'Outbound connections': 'Исходящие соединения',
  'File Activity': 'Файловая активность',
  Lifecycle: 'Жизненный цикл',
  'Lifecycle event': 'Событие жизненного цикла',
  'Lifecycle events': 'События жизненного цикла',
  'lifecycle observations': 'наблюдений жизненного цикла',
  'See process launches, lifecycle events, network activity, domains, and file operations observed for this application. Observations describe recorded activity, not configured intent, cause, or risk.':
    'Просматривайте запуски процессов, события жизненного цикла, сетевую активность, домены и файловые операции приложения. Наблюдения описывают зафиксированную активность, а не заданное поведение, причину или риск.',
  'File activity summary': 'Сводка файловой активности',
  'File activity occurrence': 'Событие файловой активности',
  'Program, command, operation, path, address, domain, or system call':
    'Программа, команда, операция, путь, адрес, домен или системный вызов',
  Operation: 'Операция',
  'All operations': 'Все операции',
  Create: 'Создание',
  Modify: 'Изменение',
  Delete: 'Удаление',
  Rename: 'Переименование',
  Copy: 'Копировать',
  'New syscall path': 'Новый путь системного вызова',
  Replacement: 'Замещение',
  'Path semantics': 'Семантика пути',
  'Collection window': 'Окно агрегации',
  'Modify activity is aggregated in fixed five-second windows. It does not represent every individual write or guarantee instantaneous visibility.':
    'События изменения агрегируются в фиксированных пятисекундных окнах. Они не отражают каждую отдельную запись и не гарантируют мгновенную видимость.',
  'Modify activity is aggregated in fixed five-second windows; it is not a list of individual writes.':
    'События изменения агрегируются в фиксированных пятисекундных окнах; это не список отдельных записей.',
  'New discoveries': 'Новые обнаружения',
  'New discovery': 'Новое обнаружение',
  'Changes after release': 'Изменения после релиза',
  'Observation history': 'История наблюдений',
  'Technical details': 'Технические данные',
  'Newly observed': 'Обнаружено недавно',
  'View discovery': 'Открыть обнаружение',
  'View changes': 'Посмотреть изменения',
  'View observation history': 'Открыть историю наблюдений',
  'Process launch': 'Запуск процесса',
  'Process terminated': 'Процесс завершён',
  'Container terminated': 'Контейнер завершён',
  'Container restarted': 'Контейнер перезапущен',
  'Restart loop observed': 'Обнаружен цикл перезапусков',
  'File create': 'Создание файла',
  'File modify': 'Изменение файла',
  'File rename': 'Переименование файла',
  'File delete': 'Удаление файла',
  Connection: 'Подключение',
  'Outbound connection': 'Исходящее соединение',
  Local: 'Локальный',
  'Local network': 'Локальная сеть',
  Internet: 'Интернет',
  'Unknown scope': 'Неизвестная область',
  'DNS request': 'DNS-запрос',
  'dns request': 'DNS-запрос',
  'DNS response': 'DNS-ответ',
  'System call': 'Системный вызов',
  'Observed activity': 'Наблюдаемое действие',
  'Opened port': 'Открыт порт',
  'Accepted inbound connection': 'Принято входящее соединение',
  'Inbound connections': 'Входящие соединения',
  'Inbound connection': 'Входящее соединение',
  'inbound observations': 'наблюдений входящих соединений',
  'All IPv4 interfaces': 'все IPv4-интерфейсы',
  'All IPv6 interfaces': 'все IPv6-интерфейсы',
  'Local endpoint': 'Локальный endpoint',
  'Remote endpoint': 'Удалённый endpoint',
  'Port observed listening': 'Порт открыт на прослушивание',
  'Accepted connections observed': 'Наблюдались принятые соединения',
  'Endpoint evidence unavailable': 'Данные наблюдения endpoint недоступны',
  'No positive endpoint evidence': 'Положительные признаки endpoint не наблюдались',
  'Inbound connection summary': 'Сводка входящего соединения',
  'Share of': 'Доля от',
  'matching recorded observations. Counts do not represent duration, traffic volume, configured intent, or risk.':
    'соответствующих зафиксированных наблюдений. Значения не отражают длительность, объем трафика, настройки или риск.',
  'Other observed': 'Прочие наблюдаемые',
  'Most observed': 'Наиболее наблюдаемые',
  'matching recorded observations across the complete filtered result, not only this list page.':
    'соответствующих зафиксированных наблюдений во всем отфильтрованном результате, а не только на этой странице.',
  Outgoing: 'Исходящий',
  Incoming: 'Входящий',
  New: 'Новое',
  'No longer observed': 'Больше не наблюдается',
  'Still observed': 'По-прежнему наблюдается',
  'Loading Changes after release…': 'Загрузка изменений после релиза…',
  'Loading complete comparison summary…': 'Загрузка полной сводки сравнения…',
  'Comparison summary unavailable': 'Сводка сравнения недоступна',
  'Comparison summary may be stale': 'Сводка сравнения могла устареть',
  'Complete release comparison summary': 'Полная сводка сравнения релизов',
  'Largest observation-count changes': 'Наибольшие изменения числа наблюдений',
  'Ranked across the complete comparison. Counts are recorded observations, not duration, traffic volume, configured intent, or risk.':
    'Рейтинг построен по полному сравнению. Значения отражают зафиксированные наблюдения, а не длительность, объем трафика, настройки или риск.',
  '· baseline': '· базовый релиз',
  '→ target': '→ целевой релиз',
  'Changes after release unavailable': 'Изменения после релиза недоступны',
  'Compare observed application activity between releases. A change is not automatically a problem, and “no longer observed” does not prove that behavior is absent.':
    'Сравните наблюдаемую активность приложения между релизами. Изменение не обязательно является проблемой, а «больше не наблюдается» не доказывает отсутствие поведения.',
  'No observed changes': 'Нет наблюдаемых изменений',
  'The selected releases have no observed activity changes on this page.':
    'Для выбранных релизов на этой странице нет изменений наблюдаемой активности.',
  'Loading New discovery…': 'Загрузка нового обнаружения…',
  'New discovery unavailable': 'Новое обнаружение недоступно',
  'Back to New discoveries': 'Назад к новым обнаружениям',
  Observations: 'Наблюдения',
  'First event ID': 'ID первого события',
  'Example observation': 'Пример наблюдения',
  'Loading observation history…': 'Загрузка истории наблюдений…',
  'Observation history unavailable': 'История наблюдений недоступна',
  'Next observation page': 'Следующая страница наблюдений',
  'No observations': 'Нет наблюдений',
  'No observations are available on this page.': 'На этой странице нет наблюдений.',
  'No activity observed': 'Активность не наблюдалась',
  'End of activity results': 'Конец списка активности',
  'Mark this discovery as resolved?': 'Отметить обнаружение как обработанное?',
  'Loading New discoveries…': 'Загрузка новых обнаружений…',
  'New discoveries unavailable': 'Новые обнаружения недоступны',
  'Application activity': 'Активность приложения',
  'Behavior observed for the first time in this application. A discovery is not automatically a problem or security incident.':
    'Поведение, впервые наблюдаемое в этом приложении. Обнаружение не обязательно является проблемой или инцидентом безопасности.',
  'Activity item not found': 'Элемент активности не найден',
  'Back to Application Activity': 'Назад к активности приложения',
  'Where observed': 'Где наблюдалось',
  Discoveries: 'Обнаружения',
  'Observation details': 'Данные наблюдений',
  'Unsafe observation link': 'Небезопасная ссылка на наблюдения',
  'This observation page is no longer valid': 'Эта страница наблюдений больше недействительна',
  'Could not load observations': 'Не удалось загрузить наблюдения',
  'Loading Application Activity…': 'Загрузка активности приложения…',
  'Loading activity distribution…': 'Загрузка распределения активности…',
  'Could not load activity distribution': 'Не удалось загрузить распределение активности',
  'No activity to visualize': 'Нет активности для визуализации',
  'No recorded observations match the selected activity type and filters.':
    'Нет зафиксированных наблюдений, соответствующих выбранному типу активности и фильтрам.',
  'Activity distribution may be stale': 'Распределение активности могло устареть',
  'Application Activity not found': 'Активность приложения не найдена',
  'See which processes this application starts and which network destinations and domains it uses. Observations describe recorded activity, not configured intent or risk.':
    'Посмотрите, какие процессы запускает приложение и какие сетевые адреса и домены использует. Наблюдения описывают зафиксированную активность, а не настройки или уровень риска.',
  'Search application activity': 'Поиск по активности приложения',
  'Program, command, address, domain, or system call':
    'Программа, команда, адрес, домен или системный вызов',
  'Could not load Application Activity': 'Не удалось загрузить активность приложения',
  'See which processes this application starts, where it connects, and what changes after each release.':
    'Узнайте, какие процессы запускает приложение, куда оно подключается и что меняется после каждого релиза.',
  'Programs and commands observed in this application.':
    'Программы и команды, наблюдаемые в этом приложении.',
  'Connections and domains observed from this application.':
    'Подключения и домены, наблюдаемые у этого приложения.',
  'Newly observed behavior to review. A discovery is not automatically a problem.':
    'Новое наблюдаемое поведение для проверки. Обнаружение не обязательно является проблемой.',
  'Releases and changes': 'Релизы и изменения',
  'Compare observed activity between releases.': 'Сравните наблюдаемую активность между релизами.',
  'Connection flow': 'Поток соединения',
  observations: 'наблюдений',
  launches: 'запусков',
  'connection observations': 'наблюдений подключений',
  'DNS observations': 'наблюдений DNS',
  'Event kind:': 'Тип события:',
  'Baseline observations': 'Наблюдения базового релиза',
  'Target observations': 'Наблюдения целевого релиза',
  'System calls': 'Системные вызовы',
  'Application activity summary': 'Сводка активности приложения',
  'Connections and domains are separate observations and are not added into a unique network activity total.':
    'Подключения и домены являются разными наблюдениями и не складываются в общее число уникальных сетевых действий.',
  'Application activity view': 'Вид активности приложения',
  'Observation payload': 'Данные наблюдения',
  'Advanced filters': 'Расширенные фильтры',
  'Narrow results by release, Kubernetes location, or observation time.':
    'Уточните результаты по релизу, расположению в Kubernetes или времени наблюдения.',
  'Narrow discoveries by behavior, review status, Kubernetes location, release, or time.':
    'Уточните обнаружения по поведению, статусу проверки, расположению в Kubernetes, релизу или времени.',
  'Observation layout': 'Режим отображения наблюдений',
  'Discovery layout': 'Режим отображения обнаружений',
  'Activity layout': 'Режим отображения активности',
  'Tile view': 'Плитка',
  'List view': 'Список',
  'Explore your environment': 'Исследуйте свою среду',
  'Browse Projects and their Applications.': 'Просматривайте проекты и их приложения.',
  'View projects': 'Открыть проекты',
  'No projects yet': 'Проектов пока нет',
  'This Organization has no Projects.': 'В этой организации нет проектов.',
  'No applications yet': 'Приложений пока нет',
  'This Project has no Applications.': 'В этом проекте нет приложений.',
  'Project sections': 'Разделы проекта',
  Breadcrumb: 'Навигационная цепочка',
  'Latest observation': 'Последнее наблюдение',
  Created: 'Создано',
  Updated: 'Обновлено',
  'Runtime observability': 'Наблюдаемость среды выполнения',
  Any: 'Любой',
  Open: 'Открыто',
  Acknowledged: 'Подтверждено',
  Resolved: 'Решено',
  'Apply filters': 'Применить фильтры',
  'First-seen event ID': 'ID первого события',
  'First seen': 'Впервые замечено',
  'Last seen': 'Последний раз замечено',
  Occurrences: 'Наблюдения',
  'Status changed': 'Статус изменен',
  Cluster: 'Кластер',
  'Representative event': 'Репрезентативное событие',
  'No occurrences': 'Нет наблюдений',
  'Lifecycle actions': 'Действия жизненного цикла',
  'Search observed identity': 'Поиск наблюдаемого объекта',
  'Executable, command, destination, domain, or syscall':
    'Исполняемый файл, команда, назначение, домен или системный вызов',
  'Active scope': 'Активная область',
  'Runtime inventory summary': 'Сводка инвентаризации',
  'Inventory behavior kind': 'Тип поведения',
  'Unsupported identity': 'Неподдерживаемый объект',
  'First observed': 'Первое наблюдение',
  'Last observed': 'Последнее наблюдение',
  'Scope and filters': 'Область и фильтры',
  Release: 'Релиз',
  'All releases': 'Все релизы',
  'Observed from': 'Наблюдалось с',
  'Observed to': 'Наблюдалось до',
  'Release evidence': 'Данные релиза',
  Namespace: 'Пространство имен',
  Pod: 'Под',
  Container: 'Контейнер',
  Observed: 'Наблюдалось',
  Workload: 'Рабочая нагрузка',
  Command: 'Команда',
  Node: 'Узел',
  Evidence: 'Данные',
  'Inventory evidence': 'Данные инвентаризации',
  'Deployment history': 'История развертываний',
  'No releases yet': 'Релизов пока нет',
  'Release history will appear here.': 'Здесь появится история релизов.',
  'Release comparison': 'Сравнение релизов',
  'Backend-selected baseline': 'Базовый релиз выбран сервером',
  Target: 'Целевой релиз',
  Baseline: 'Базовый релиз',
  'First-seen notification': 'Уведомление о первом обнаружении',
  Deliveries: 'Доставки',
  Succeeded: 'Успешно',
  Failed: 'Неудачно',
  'Unknown value': 'Неизвестное значение',
  Process: 'Процесс',
  Name: 'Имя',
  'Query type': 'Тип запроса',
  Response: 'Ответ',
  Transport: 'Транспорт',
  Destination: 'Назначение',
  Port: 'Порт',
  Outcome: 'Результат',
  Direction: 'Направление',
  Resolver: 'Резолвер',
  Answers: 'Ответы',
  'Project operations': 'Операции проекта',
  'Notification health': 'Состояние уведомлений',
  'Health data is stale': 'Данные о состоянии устарели',
  'Create destination': 'Создать назначение',
  'No webhook destinations': 'Нет назначений вебхуков',
  'Create webhook destination': 'Создать назначение вебхука',
  'Webhook destination': 'Назначение вебхука',
  Backfill: 'Ретроспективная отправка',
  Revision: 'Ревизия',
  Disabled: 'Отключено',
  Edit: 'Изменить',
  'Save the signing secret now': 'Сохраните секрет подписи сейчас',
  'Copy secret': 'Копировать секрет',
  'Secret copied to clipboard.': 'Секрет скопирован в буфер обмена.',
  'No notification deliveries': 'Нет доставок уведомлений',
  'Notification delivery': 'Доставка уведомления',
  Event: 'Событие',
  Origin: 'Источник происхождения',
  Source: 'Источник',
  'Semantic event': 'Семантическое событие',
  Attempts: 'Попытки',
  Available: 'Доступно',
  'Next attempt': 'Следующая попытка',
  'Terminal outcome': 'Конечный результат',
  'No attempts recorded.': 'Попытки не зарегистрированы.',
  Started: 'Начато',
  Finished: 'Завершено',
  Duration: 'Длительность',
  'Notification operations': 'Операции с уведомлениями',
  'Recovery history': 'История восстановления',
  'Recovery operation': 'Операция восстановления',
  'Recovery actions': 'Действия восстановления',
  'Retry delivery': 'Повторить доставку',
  'Bulk retry failed deliveries': 'Массово повторить неудачные доставки',
  'All commands': 'Все команды',
  Retry: 'Повторить',
  Cancel: 'Отменить',
  'Bulk retry': 'Массовый повтор',
  'No recovery operations recorded.': 'Операции восстановления не зарегистрированы.',
  Actor: 'Исполнитель',
  Selected: 'Выбрано',
  Retried: 'Повторено',
  Cancelled: 'Отменено',
  Skipped: 'Пропущено',
  Remaining: 'Осталось',
  Completed: 'Завершено',
  'Affected deliveries': 'Затронутые доставки',
  Archived: 'В архиве',
  Attempt: 'Попытка',
  'Attempt timeline': 'Хронология попыток',
  'Availability is determined by the latest server response.':
    'Доступность действий определяется последним ответом сервера.',
  'Back to Releases': 'Назад к релизам',
  'Back to Runtime Groups': 'Назад к группам среды выполнения',
  'Back to Runtime Inventory': 'Назад к инвентаризации среды выполнения',
  'Baseline occurrences': 'Наблюдения базового релиза',
  'Baseline release': 'Базовый релиз',
  'Bulk retry failed': 'Не удалось выполнить массовый повтор',
  'CNAME chain': 'Цепочка CNAME',
  'Cancel delivery': 'Отменить доставку',
  'Clear filters': 'Очистить фильтры',
  'Command completed:': 'Команда выполнена:',
  'Command type': 'Тип команды',
  'Configure delivery receivers and investigate notification attempts.':
    'Настройте получателей и исследуйте попытки доставки уведомлений.',
  'Confirm bulk retry?': 'Подтвердить массовый повтор?',
  'Copy JSON': 'Копировать JSON',
  'Could not load Runtime Inventory': 'Не удалось загрузить инвентаризацию среды выполнения',
  'Could not load evidence': 'Не удалось загрузить данные наблюдения',
  'Could not load inventory summary': 'Не удалось загрузить сводку инвентаризации',
  'Create a destination to send project notifications to your receiver.':
    'Создайте назначение для отправки уведомлений проекта вашему получателю.',
  'Deliver backfilled events': 'Доставлять ретроспективные события',
  'Deliveries could not be loaded': 'Не удалось загрузить доставки',
  'Deliveries will appear here after notification events or destination tests.':
    'Доставки появятся здесь после событий уведомлений или проверки назначения.',
  Delivery: 'Доставка',
  'Delivery could not be loaded': 'Не удалось загрузить доставку',
  'Delivery history': 'История доставки',
  'Delivery pages': 'Страницы доставок',
  Deployed: 'Развернуто',
  'Destination ID': 'ID назначения',
  'Destination URL': 'URL назначения',
  'Destination could not be loaded': 'Не удалось загрузить назначение',
  'Destination could not be saved': 'Не удалось сохранить назначение',
  'Destinations could not be loaded': 'Не удалось загрузить назначения',
  Disable: 'Отключить',
  Errno: 'Код errno',
  'Error class': 'Класс ошибки',
  'Event kind': 'Тип события',
  'Event payload': 'Данные события',
  'Evidence expires': 'Срок действия данных',
  'Failed after': 'Сбой после',
  'Failed before': 'Сбой до',
  'HTTP status': 'Статус HTTP',
  'Inventory item not found': 'Элемент инвентаризации не найден',
  'Last safe error class': 'Последний безопасный класс ошибки',
  Limit: 'Лимит',
  'Lifecycle update failed': 'Не удалось обновить жизненный цикл',
  More: 'Ещё',
  'Network connection attempt': 'Попытка сетевого подключения',
  'Network destination summary': 'Сводка сетевого назначения',
  Next: 'Следующая',
  'Next occurrence page': 'Следующая страница наблюдений',
  'Next page': 'Следующая страница',
  'No comparison baseline': 'Нет базового релиза для сравнения',
  'No occurrence evidence is available on this page.': 'На этой странице нет данных наблюдений.',
  'No runtime changes': 'Нет изменений среды выполнения',
  'Notification health could not be loaded': 'Не удалось загрузить состояние уведомлений',
  'Observed DNS names': 'Наблюдаемые DNS-имена',
  'Observed behavior across the active application scope.':
    'Поведение, наблюдаемое в активной области приложения.',
  'Observed since': 'Наблюдается с',
  'Occurrence payload': 'Данные наблюдения',
  'Occurrences unavailable': 'Наблюдения недоступны',
  'Only fields supported by the published OpenAPI contract are editable.':
    'Можно изменять только поля, поддерживаемые опубликованным контрактом OpenAPI.',
  'Organization could not be loaded': 'Не удалось загрузить организацию',
  'Plaintext DNS evidence only. Cached or encrypted DNS may be unavailable.':
    'Показаны только данные незашифрованного DNS. Кэшированные или зашифрованные DNS-запросы могут быть недоступны.',
  Previous: 'Предыдущая',
  'Project not found': 'Проект не найден',
  'Projects could not be loaded': 'Не удалось загрузить проекты',
  'Projects could not be refreshed': 'Не удалось обновить проекты',
  'Recently first seen': 'Недавно обнаружено впервые',
  'Recently observed DNS evidence': 'Недавно полученные данные DNS',
  'Recovery command failed': 'Не удалось выполнить команду восстановления',
  'Recovery generation': 'Поколение восстановления',
  'Recovery history could not be loaded': 'Не удалось загрузить историю восстановления',
  'Recovery operation could not be loaded': 'Не удалось загрузить операцию восстановления',
  'Recovery pages': 'Страницы восстановления',
  'Release ID': 'ID релиза',
  'Release ownership mismatch': 'Релиз принадлежит другому приложению',
  'Releases unavailable': 'Релизы недоступны',
  'Request ID': 'ID запроса',
  'Resolve marks the current behavior as handled. You can reopen it later.':
    'После решения текущее поведение будет отмечено как обработанное. Позже его можно открыть снова.',
  'Resolve this runtime group?': 'Решить эту группу среды выполнения?',
  'Resource does not belong to this Application': 'Ресурс не принадлежит этому приложению',
  'Retry health refresh': 'Повторить обновление состояния',
  'Return to first page': 'Вернуться на первую страницу',
  'Review bulk retry': 'Проверка массового повтора',
  'Review failed deliveries': 'Проверить неудачные доставки',
  'Rotate secret': 'Сменить секрет',
  'Runtime Diff unavailable': 'Сравнение среды выполнения недоступно',
  'Runtime Group unavailable': 'Группа среды выполнения недоступна',
  'Runtime Groups unavailable': 'Группы среды выполнения недоступны',
  'Runtime Inventory scope not found': 'Область инвентаризации среды выполнения не найдена',
  'Safe error class': 'Безопасный класс ошибки',
  'Select only the failed deliveries matching these server-side filters. The command is bounded to 200 deliveries.':
    'Выберите только неудачные доставки, соответствующие этим серверным фильтрам. Команда обработает не более 200 доставок.',
  'Semantic summary': 'Семантическая сводка',
  Status: 'Статус',
  'Target occurrences': 'Наблюдения целевого релиза',
  Terminal: 'Завершено',
  'Test delivery failed': 'Не удалось выполнить тестовую доставку',
  'The collection scope is preserved. Return to its first page to continue.':
    'Область коллекции сохранена. Для продолжения вернитесь на первую страницу.',
  'The last successful snapshot is still shown because the latest refresh failed.':
    'Показан последний успешный снимок, поскольку последнее обновление завершилось с ошибкой.',
  'The response was withheld because its ownership does not match this route.':
    'Ответ скрыт, поскольку ресурс не принадлежит объекту этого маршрута.',
  'The selected releases have no runtime diff entries.':
    'Для выбранных релизов нет различий среды выполнения.',
  'This cursor is no longer valid': 'Этот курсор больше недействителен',
  'This describes notification delivery, not overall Okoscope availability.':
    'Это состояние доставки уведомлений, а не общая доступность Okoscope.',
  'This evidence cursor is no longer valid': 'Этот курсор данных больше недействителен',
  'This is the first comparable release or no baseline is available.':
    'Это первый сравнимый релиз либо базовый релиз недоступен.',
  "This secret is shown once and cannot be retrieved again after this dialog closes. Store it in your receiver's secret manager.":
    'Этот секрет показывается один раз и будет недоступен после закрытия окна. Сохраните его в менеджере секретов получателя.',
  'Unsafe evidence link': 'Небезопасная ссылка на данные',
  'View evidence': 'Открыть данные',
  'View group': 'Открыть группу',
  'View runtime diff': 'Открыть сравнение среды выполнения',
  'Webhook destinations': 'Назначения вебхуков',
  'Loading Application…': 'Загрузка приложения…',
  'Loading Organization…': 'Загрузка организации…',
  'Loading Project…': 'Загрузка проекта…',
  'Loading Releases…': 'Загрузка релизов…',
  'Loading Runtime Diff…': 'Загрузка сравнения среды выполнения…',
  'Loading Runtime Groups…': 'Загрузка групп среды выполнения…',
  'Loading Runtime Group…': 'Загрузка группы среды выполнения…',
  'Loading Runtime Inventory…': 'Загрузка инвентаризации среды выполнения…',
  'Loading applications…': 'Загрузка приложений…',
  'Loading delivery…': 'Загрузка доставки…',
  'Loading destination…': 'Загрузка назначения…',
  'Loading inventory evidence…': 'Загрузка данных инвентаризации…',
  'Loading inventory summary…': 'Загрузка сводки инвентаризации…',
  'Loading notification deliveries…': 'Загрузка доставок уведомлений…',
  'Loading notification health…': 'Загрузка состояния уведомлений…',
  'Loading occurrences…': 'Загрузка наблюдений…',
  'Loading projects…': 'Загрузка проектов…',
  'Loading recovery history…': 'Загрузка истории восстановления…',
  'Loading recovery operation…': 'Загрузка операции восстановления…',
  'Loading webhook destinations…': 'Загрузка назначений вебхуков…',
  '. Operation': '. Операция',
  '. The IP remains the canonical destination.': '. IP остаётся каноническим назначением.',
  '; cancelled': '; отменено',
  '; remaining': '; осталось',
  '; retried': '; повторено',
  '; skipped': '; пропущено',
  'Action failed': 'Не удалось выполнить действие',
  'Address family': 'Семейство адресов',
  'Application not found': 'Приложение не найдено',
  'Applications could not be loaded': 'Не удалось загрузить приложения',
  'DNS behavior summary': 'Сводка поведения DNS',
  'DNS context': 'Контекст DNS',
  'DNS observation': 'Наблюдение DNS',
  'Edit webhook destination': 'Изменить назначение вебхука',
  'Status:': 'Статус:',
  'due; oldest due delivery is': 'ожидают отправки; самая старая доставка ожидает уже',
  evidence: 'данные',
  occurrences: 'наблюдений',
  'old.': 'назад.',
  options: 'параметры',
  retried: 'повторено',
  '· generation': '· поколение',
  '… nested value': '… вложенное значение',
  '… output limited': '… вывод ограничен',
  ' (idempotent replay)': ' (идемпотентное воспроизведение)',
  '; idempotent replay': '; идемпотентное воспроизведение',
  '; more matches remain': '; остались другие совпадения',
  'Active destinations': 'Активные назначения',
  'Adjust the filters to broaden this view.': 'Измените фильтры, чтобы расширить выборку.',
  'Ambiguous: multiple names were observed for this IP.':
    'Неоднозначно: для этого IP наблюдалось несколько имён.',
  'Backfill suppressed': 'Ретроспективная отправка подавлена',
  'Cancel this delivery?': 'Отменить эту доставку?',
  'Confirm bulk retry': 'Подтвердить массовый повтор',
  'Confirm resolve': 'Подтвердить решение',
  'Confirming…': 'Подтверждение…',
  'Connection attempt continues asynchronously; establishment is not confirmed':
    'Попытка подключения продолжается асинхронно; установка соединения не подтверждена',
  'Could not copy JSON': 'Не удалось скопировать JSON',
  'Deliveries failing': 'Доставки завершаются с ошибкой',
  'Deliveries retrying': 'Доставки повторяются',
  'Delivery backlogged': 'Доставка задерживается',
  'Delivery disabled': 'Доставка отключена',
  'Delivery enabled': 'Доставка включена',
  'Delivery failed': 'Доставка не выполнена',
  'Delivery has not completed. If the delivery worker is disabled, it will remain pending.':
    'Доставка не завершена. Если обработчик доставки отключён, она останется в ожидании.',
  'Delivery healthy': 'Доставка работает нормально',
  'Delivery is currently in progress.': 'Доставка выполняется.',
  'Delivery is enabled and the notification queue is empty.':
    'Доставка включена, очередь уведомлений пуста.',
  'Delivery stopped after a terminal failure.': 'Доставка остановлена после неисправимой ошибки.',
  'Delivery worker draining': 'Обработчик доставки завершает работу',
  'Destination disabled.': 'Назначение отключено.',
  'Disable destination?': 'Отключить назначение?',
  'End of evidence results': 'Конец списка данных',
  'End of inventory results': 'Конец списка инвентаризации',
  'Expired leases': 'Истёкшие аренды',
  'First seen from': 'Впервые замечено с',
  'First seen to': 'Впервые замечено до',
  'In flight': 'В процессе',
  'JSON copied': 'JSON скопирован',
  'JSON details': 'Детали JSON',
  'Last seen to': 'Последнее наблюдение до',
  'Load more applications': 'Загрузить ещё приложения',
  'Load more projects': 'Загрузить ещё проекты',
  'Missing evidence link': 'Отсутствует ссылка на данные',
  'New notifications will no longer be delivered to this receiver.':
    'Новые уведомления больше не будут доставляться этому получателю.',
  'No address answer': 'Нет ответа с адресом',
  'No baseline available': 'Базовый релиз недоступен',
  'No description': 'Нет описания',
  'No evidence available': 'Данные недоступны',
  'No items match the active application scope and filters.':
    'Нет элементов, соответствующих активной области приложения и фильтрам.',
  'No matching runtime groups': 'Нет подходящих групп среды выполнения',
  'No matching discoveries': 'Нет подходящих обнаружений',
  'No discoveries yet': 'Обнаружений пока нет',
  'Newly observed behavior will appear here.':
    'Здесь появится поведение, впервые обнаруженное в приложении.',
  'No observed behavior': 'Нет наблюдаемого поведения',
  'No runtime groups yet': 'Групп среды выполнения пока нет',
  'No trusted attributed evidence is available for evaluation.':
    'Для оценки нет достоверных атрибутированных данных.',
  'No webhook destination is configured for this project.':
    'Для этого проекта не настроено назначение вебхука.',
  'Not configured': 'Не настроено',
  'Not observed in available evidence': 'Не наблюдалось в доступных данных',
  'Not terminal': 'Не завершено',
  'Notification delivery is disabled by the server operator.':
    'Доставка уведомлений отключена оператором сервера.',
  'Notification was intentionally suppressed for backfilled data.':
    'Уведомление намеренно подавлено для ретроспективных данных.',
  'Notifications are waiting longer than expected to be delivered.':
    'Уведомления ожидают доставки дольше обычного.',
  'Notifications · Okoscope': 'Уведомления · Okoscope',
  'Observed behavior will appear here.': 'Здесь появится наблюдаемое поведение.',
  'Oldest due age': 'Возраст самой старой ожидающей доставки',
  'One or more notification deliveries reached a terminal failure.':
    'Одна или несколько доставок уведомлений завершились неисправимой ошибкой.',
  'Organization · Okoscope': 'Организация · Okoscope',
  'Pending delivery will stop and become cancelled.':
    'Ожидающая доставка будет остановлена и отменена.',
  'Projects · Okoscope': 'Проекты · Okoscope',
  'Receivers are returning temporary errors and deliveries will be retried.':
    'Получатели возвращают временные ошибки; доставка будет повторена.',
  'Recovery history · Okoscope': 'История восстановления · Okoscope',
  'Resolving…': 'Решение…',
  'Retry this delivery?': 'Повторить эту доставку?',
  'Rotate signing secret?': 'Сменить секрет подписи?',
  'Save changes': 'Сохранить изменения',
  'Saving…': 'Сохранение…',
  'Send test delivery': 'Отправить тестовую доставку',
  'Sending…': 'Отправка…',
  'Signing secret rotated.': 'Секрет подписи изменён.',
  'Submitting…': 'Отправка…',
  'Syscall failed': 'Системный вызов завершился ошибкой',
  'Syscall succeeded': 'Системный вызов выполнен успешно',
  'Test delivery failed. See the error details.':
    'Тестовая доставка не выполнена. Подробности приведены в описании ошибки.',
  'The delivery becomes pending again with a new recovery generation.':
    'Доставка снова перейдёт в ожидание с новым поколением восстановления.',
  'The delivery worker is finishing active work during shutdown or an update.':
    'Обработчик доставки завершает активную работу перед остановкой или обновлением.',
  'The response does not belong to this route.': 'Ответ не принадлежит этому маршруту.',
  'This item was not seen in the release’s available attributed evidence.':
    'Этот элемент не встречался в доступных атрибутированных данных релиза.',
  'This terminal cursor page is empty. Use browser Back or return to the first page.':
    'Последняя страница курсора пуста. Вернитесь назад в браузере или на первую страницу.',
  'Trusted attributed occurrences support this relation.':
    'Связь подтверждена достоверными атрибутированными наблюдениями.',
  'Updating…': 'Обновление…',
  'Workload kind': 'Тип рабочей нагрузки',
  'Workload name': 'Имя рабочей нагрузки',
  pending: 'ожидает',
  succeeded: 'успешно',
  failed: 'ошибка',
  retrying: 'повторяется',
  cancelled: 'отменено',
  canceled: 'отменено',
  completed: 'завершено',
  acknowledged: 'подтверждено',
  resolved: 'решено',
  open: 'открыто',
  retry: 'повторить',
  cancel: 'отменить',
  bulk_retry: 'массовый повтор',
  enabled: 'включено',
  disabled: 'отключено',
  Processes: 'Процессы',
  Destinations: 'Сетевые назначения',
  Domains: 'Домены',
  Syscalls: 'Системные вызовы',
  Sightings: 'Факты обнаружения',
  Groups: 'Группы',
  Delivering: 'Доставляется',
  Delivered: 'Доставлено',
  Unknown: 'Неизвестно',
  Unavailable: 'Недоступно',
  Pending: 'Ожидает доставки',
  Acknowledge: 'Подтвердить',
  Resolve: 'Решить',
  Reopen: 'Открыть снова',
  NEW: 'НОВОЕ',
  'Discovery status': 'Статус обнаружения',
  'leads to': 'приводит к',
}

type TranslationRecord = { source: string; rendered: string }
let originals = new WeakMap<Node, TranslationRecord>()
let attributeOriginals = new WeakMap<Element, Map<string, TranslationRecord>>()
const attributes = ['aria-label', 'placeholder', 'title']
function localize(value: string, locale: Locale): string {
  if (locale === 'en') return value
  const exact = legacyRussian[value.trim()]
  if (exact) return value.replace(value.trim(), exact)
  const uniqueBehaviors = value.match(/^(\d[\d\s.,]*) unique behaviors$/)
  if (uniqueBehaviors)
    return `${uniqueBehaviors[1]} ${russianCountNoun(uniqueBehaviors[1]!, 'уникальный вариант поведения', 'уникальных варианта поведения', 'уникальных вариантов поведения')}`
  const uniqueIdentities = value.match(/^(\d[\d\s.,]*) unique identities$/)
  if (uniqueIdentities)
    return `${uniqueIdentities[1]} ${russianCountNoun(uniqueIdentities[1]!, 'уникальная идентичность', 'уникальные идентичности', 'уникальных идентичностей')}`
  const observedBehavior = value.match(/^(Most|Other) observed (.+)$/)
  if (observedBehavior)
    return `${observedBehavior[1] === 'Most' ? 'Наиболее наблюдаемые' : 'Прочие наблюдаемые'} ${localize(observedBehavior[2]!, locale)}`
  const copyMatch = value.match(/^Copy (.+)$/)
  if (copyMatch) return `Копировать ${localize(copyMatch[1]!, locale)}`
  const confirmMatch = value.match(/^Confirm (.+)$/)
  if (confirmMatch) return `Подтвердить: ${localize(confirmMatch[1]!, locale)}`
  const loadingEvidence = value.match(/^Loading (.+) evidence…$/)
  if (loadingEvidence) return `Загрузка данных «${localize(loadingEvidence[1]!, locale)}»…`
  const loadingInventory = value.match(/^Loading (.+) inventory…$/)
  if (loadingInventory)
    return `Загрузка инвентаризации «${localize(loadingInventory[1]!, locale)}»…`
  const noEvidence = value.match(/^No (.+) evidence is available for this item\.$/)
  if (noEvidence) return `Для этого элемента нет данных типа «${localize(noEvidence[1]!, locale)}».`
  const retryAtMost = value.match(
    /^Retry at most (\d+) failed deliveries matching the supplied filters\.$/,
  )
  if (retryAtMost)
    return `Повторить не более ${retryAtMost[1]} неудачных доставок, соответствующих фильтрам.`
  const testQueued = value.match(/^Test delivery queued with status (.+)\.$/)
  if (testQueued)
    return `Тестовая доставка поставлена в очередь со статусом «${localize(testQueued[1]!, locale)}».`
  const ambiguousDns = value.match(
    /^Ambiguous: multiple names were observed for this IP\. Evidence expires (.+)\. The IP remains the canonical destination\.$/,
  )
  if (ambiguousDns)
    return `Неоднозначно: для этого IP наблюдалось несколько имён. Срок действия данных: ${ambiguousDns[1]}. IP остаётся каноническим назначением.`
  const titlePatterns: Array<[RegExp, string]> = [
    [/^Changes after release · (.+)$/, 'Изменения после релиза · $1'],
    [/^New discoveries · (.+)$/, 'Новые обнаружения · $1'],
    [/^New discovery · (.+)$/, 'Новое обнаружение · $1'],
    [/^Application Activity · (.+)$/, 'Активность приложения · $1'],
    [/^Observation history · (.+)$/, 'История наблюдений · $1'],
    [/^Runtime Diff · (.+)$/, 'Различия среды выполнения · $1'],
    [/^Runtime Groups · (.+)$/, 'Группы среды выполнения · $1'],
    [/^Runtime Group · (.+)$/, 'Группа среды выполнения · $1'],
    [/^Runtime inventory · (.+)$/, 'Инвентаризация среды выполнения · $1'],
    [/^Inventory evidence · (.+)$/, 'Данные инвентаризации · $1'],
    [/^Releases · (.+)$/, 'Релизы · $1'],
    [/^Delivery (.+) · Okoscope$/, 'Доставка $1 · Okoscope'],
    [/^Recovery (.+) · Okoscope$/, 'Восстановление $1 · Okoscope'],
    [/^(.+) · Notifications · Okoscope$/, '$1 · Уведомления · Okoscope'],
  ]
  for (const [pattern, replacement] of titlePatterns)
    if (pattern.test(value)) return value.replace(pattern, replacement)
  return value
}

function russianCountNoun(value: string, one: string, few: string, many: string): string {
  const count = Number(value.replace(/[^\d]/g, ''))
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = count % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export function localizeDocument(locale: Locale, root: ParentNode = document) {
  let applying = false
  let originalTitle = document.title
  let renderedTitle = document.title
  const apply = () => {
    if (applying) return
    applying = true
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node: Node | null
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('[translate="no"]')) continue
      const current = node.textContent ?? ''
      let record = originals.get(node)
      if (!record) {
        record = { source: current, rendered: current }
        originals.set(node, record)
      } else if (current !== record.rendered) {
        record.source = current
      }
      const next = localize(record.source, locale)
      record.rendered = next
      if (node.textContent !== next) node.textContent = next
    }
    for (const element of root.querySelectorAll('*')) {
      if (element.closest('[translate="no"]')) continue
      for (const attribute of attributes) {
        const current = element.getAttribute(attribute)
        if (current === null) continue
        let saved = attributeOriginals.get(element)
        if (!saved) {
          saved = new Map()
          attributeOriginals.set(element, saved)
        }
        let record = saved.get(attribute)
        if (!record) {
          record = { source: current, rendered: current }
          saved.set(attribute, record)
        } else if (current !== record.rendered) {
          record.source = current
        }
        const next = localize(record.source, locale)
        record.rendered = next
        if (next !== current) element.setAttribute(attribute, next)
      }
    }
    if (document.title !== renderedTitle) originalTitle = document.title
    renderedTitle = localize(originalTitle, locale)
    if (document.title !== renderedTitle) document.title = renderedTitle
    applying = false
  }
  apply()
  if (locale === 'en') {
    originals = new WeakMap<Node, TranslationRecord>()
    attributeOriginals = new WeakMap<Element, Map<string, TranslationRecord>>()
    return () => undefined
  }
  const observer = new MutationObserver(apply)
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: attributes,
  })
  return () => observer.disconnect()
}
