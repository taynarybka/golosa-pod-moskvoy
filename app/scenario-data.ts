export type StationResourceKind = "rice" | "medkit" | "wire" | "curiosity";
export type StationResource = { kind: StationResourceKind; label: string; icon: string; detail: string };

export const scenarioEdgeMarks = {
  "tunnel:1::сокольники|1::красносельская::forward": "closed",
  "tunnel:1::сокольники|1::красносельская::backward": "closed",
  "tunnel:1::красные ворота|1::чистые пруды::forward": "closed",
  "tunnel:1::красные ворота|1::чистые пруды::backward": "closed",
  "tunnel:1::чистые пруды|1::лубянка::forward": "closed",
  "tunnel:1::чистые пруды|1::лубянка::backward": "closed",
  "tunnel:1::охотный ряд|1::библиотека им.ленина::forward": "closed",
  "tunnel:1::охотный ряд|1::библиотека им.ленина::backward": "closed",
  "tunnel:1::саларьево|1::филатов луг::forward": "closed",
  "tunnel:1::саларьево|1::филатов луг::backward": "closed",
  "tunnel:2::новокузнецкая|2::павелецкая::forward": "closed",
  "tunnel:2::новокузнецкая|2::павелецкая::backward": "closed",
  "tunnel:3::киевская|3::парк победы::forward": "closed",
  "tunnel:3::киевская|3::парк победы::backward": "closed",
  "tunnel:4::студенческая|4::киевская::forward": "closed",
  "tunnel:4::студенческая|4::киевская::backward": "closed",
  "tunnel:4::арбатская|4::александровский сад::forward": "closed",
  "tunnel:4::арбатская|4::александровский сад::backward": "closed",
  "tunnel:6::профсоюзная|6::новые черемушки::forward": "closed",
  "tunnel:6::профсоюзная|6::новые черемушки::backward": "closed",
  "tunnel:6::ясенево|6::новоясеневская::forward": "closed",
  "tunnel:6::ясенево|6::новоясеневская::backward": "closed",
  "tunnel:7::кузнецкий мост|7::китай-город::forward": "closed",
  "tunnel:7::кузнецкий мост|7::китай-город::backward": "closed",
  "tunnel:7::китай-город|7::таганская::forward": "closed",
  "tunnel:7::китай-город|7::таганская::backward": "closed",
  "tunnel:7::таганская|7::пролетарская::forward": "closed",
  "tunnel:7::таганская|7::пролетарская::backward": "closed",
  "tunnel:8A::деловой центр|8A::парк победы::forward": "closed",
  "tunnel:8A::деловой центр|8A::парк победы::backward": "closed",
  "tunnel:9::дмитровская|9::савеловская::forward": "closed",
  "tunnel:9::дмитровская|9::савеловская::backward": "closed",
  "tunnel:9::савеловская|9::менделеевская::forward": "closed",
  "tunnel:9::савеловская|9::менделеевская::backward": "closed",
  "tunnel:10::чкаловская|10::римская::forward": "closed",
  "tunnel:10::чкаловская|10::римская::backward": "closed",
  "tunnel:10::волжская|10::люблино::forward": "closed",
  "tunnel:10::волжская|10::люблино::backward": "closed",
  "tunnel:11::сокольники|11::рижская::forward": "closed",
  "tunnel:11::сокольники|11::рижская::backward": "closed",
  "tunnel:11::марьина роща|11::савеловская::forward": "closed",
  "tunnel:11::марьина роща|11::савеловская::backward": "closed",
  "tunnel:11::петровский парк|11::цска::forward": "closed",
  "tunnel:11::петровский парк|11::цска::backward": "closed",
  "tunnel:11::терехово|11::кунцевская::forward": "closed",
  "tunnel:11::терехово|11::кунцевская::backward": "closed",
  "closed-branch:11::хорошевская|11::шелепиха::forward": "closed",
  "closed-branch:11::хорошевская|11::шелепиха::backward": "closed",
  "closed-branch:11::шелепиха|11::деловой центр::forward": "closed",
  "closed-branch:11::шелепиха|11::деловой центр::backward": "closed",
  "tunnel:15::юго-восточная|15::косино::forward": "closed",
  "tunnel:15::юго-восточная|15::косино::backward": "closed",
  "tunnel:11::рижская|11::марьина роща::backward": "unknown",
  "tunnel:7::беговая|7::улица 1905 года::backward": "unknown",
  "tunnel:7::планерная|7::сходненская::forward": "unknown",
  "tunnel:8A::солнцево|8A::боровское шоссе::forward": "unknown",
  "tunnel:6::ленинский проспект|6::академическая::forward": "unknown",
  "tunnel:10::братиславская|10::марьино::backward": "unknown",
  "tunnel:10::трубная|10::сретенский бульвар::forward": "unknown",
  "tunnel:2::орехово|2::домодедовская::backward": "unknown",
  "tunnel:10::яхромская|10::селигерская::backward": "unknown",
  "tunnel:10::марьино|10::борисово::forward": "unknown",
  "tunnel:3::строгино|3::мякинино::backward": "unknown",
  "tunnel:9::пражская|9::улица академика янгеля::forward": "unknown",
  "tunnel:1::парк культуры|1::фрунзенская::backward": "unknown",
  "tunnel:2::ховрино|2::беломорская::backward": "unknown",
  "tunnel:8::новогиреево|8::перово::forward": "unknown",
  "tunnel:4::киевская|4::деловой центр (выставочная)::forward": "unknown",
  "tunnel:12::лесопарковая|12::битцевский парк::backward": "unknown",
  "tunnel:1::румянцево|1::саларьево::backward": "unknown",
  "tunnel:5::белорусская|5::новослободская::backward": "unknown",
  "tunnel:6::третьяковская|6::октябрьская::forward": "unknown",
  "tunnel:2::кантемировская|2::царицыно::forward": "unknown",
  "tunnel:1::новомосковская (коммунарка)|1::потапово::forward": "unknown",
  "tunnel:10::марьина роща|10::достоевская::forward": "unknown",
  "tunnel:16::вавиловская|16::новаторская::backward": "unknown",
  "tunnel:5::октябрьская|5::парк культуры::forward": "unknown",
  "tunnel:8::новокосино|8::новогиреево::backward": "unknown",
  "tunnel:6::медведково|6::бабушкинская::forward": "unknown",
  "tunnel:2::ховрино|2::беломорская::forward": "unknown",
  "tunnel:4::багратионовская|4::фили::backward": "unknown",
  "tunnel:6::калужская|6::беляево::backward": "unknown",
  "tunnel:8A::новопеределкино|8A::рассказовка::forward": "unknown",
  "tunnel:6::свиблово|6::ботанический сад::forward": "unknown",
  "tunnel:3::площадь революции|3::арбатская::forward": "unknown",
  "tunnel:10::верхние лихоборы|10::окружная::forward": "unknown",
  "tunnel:11::зюзино|11::каховская::forward": "unknown",
  "tunnel:7::пушкинская|7::кузнецкий мост::forward": "unknown",
  "tunnel:6::шаболовская|6::ленинский проспект::backward": "unknown",
  "tunnel:9::серпуховская|9::тульская::forward": "unknown",
  "tunnel:2::автозаводская|2::технопарк::backward": "unknown",
  "tunnel:5::парк культуры|5::киевская::forward": "unknown",
  "tunnel:10::трубная|10::сретенский бульвар::backward": "unknown",
  "tunnel:11::проспект вернадского|11::новаторская::backward": "unknown",
  "tunnel:1::ольховая|1::новомосковская (коммунарка)::backward": "unknown",
  "tunnel:7::планерная|7::сходненская::backward": "unknown",
  "tunnel:3::молодежная|3::крылатское::forward": "unknown",
  "tunnel:16::новаторская|16::университет дружбы народов::backward": "unknown",
  "tunnel:3::курская|3::площадь революции::backward": "unknown",
  "tunnel:1::тропарево|1::румянцево::forward": "unknown",
  "tunnel:2::павелецкая|2::автозаводская::backward": "unknown",
  "tunnel:6::беляево|6::коньково::backward": "unknown",
  "tunnel:4::киевская|4::смоленская::forward": "unknown",
  "tunnel:3::электрозаводская|3::бауманская::forward": "unknown",
  "tunnel:3::парк победы|3::славянский бульвар::forward": "unknown",
  "tunnel:8A::озерная|8A::говорово::backward": "unknown",
  "tunnel:2::белорусская|2::маяковская::backward": "unknown",
  "tunnel:1::новомосковская (коммунарка)|1::потапово::backward": "unknown",
  "tunnel:2::аэропорт|2::динамо::forward": "unknown",
  "tunnel:6::октябрьская|6::шаболовская::backward": "unknown",
  "tunnel:8::площадь ильича|8::марксистская::backward": "unknown",
  "tunnel:9::аннино|9::бульвар дмитрия донского::backward": "unknown",
  "tunnel:10::окружная|10::петровско-разумовская::backward": "unknown",
  "tunnel:4::кутузовская|4::студенческая::backward": "unknown",
  "tunnel:1::красносельская|1::комсомольская::forward": "unknown",
  "tunnel:9::алтуфьево|9::бибирево::backward": "unknown",
  "tunnel:7::жулебино|7::котельники::forward": "unknown",
  "tunnel:4::кутузовская|4::студенческая::forward": "unknown",
  "tunnel:2::коломенская|2::каширская::backward": "unknown",
  "tunnel:3::волоколамская|3::митино::backward": "unknown",
  "tunnel:9::цветной бульвар|9::чеховская::forward": "unknown",
  "tunnel:16::университет дружбы народов|16::генерала тюленева::backward": "unknown",
  "tunnel:1::комсомольская|1::красные ворота::forward": "unknown",
  "tunnel:5::киевская|5::краснопресненская::backward": "unknown",
  "tunnel:1::прокшино|1::ольховая::backward": "unknown",
  "tunnel:7::сходненская|7::тушинская::forward": "unknown",
  "tunnel:10::петровско-разумовская|10::фонвизинская::backward": "unknown",
  "tunnel:9::бибирево|9::отрадное::backward": "unknown",
  "tunnel:16::зил|16::крымская::forward": "unknown",
  "tunnel:10::шипиловская|10::зябликово::forward": "unknown",
  "tunnel:2::кантемировская|2::царицыно::backward": "unknown",
  "tunnel:9::нагатинская|9::нагорная::forward": "unknown",
  "tunnel:11::савеловская|11::петровский парк::forward": "unknown",
  "tunnel:3::щелковская|3::первомайская::backward": "unknown",
  "tunnel:8::авиамоторная|8::площадь ильича::backward": "unknown",
  "tunnel:10::сретенский бульвар|10::чкаловская::backward": "unknown",
  "tunnel:11::авиамоторная|11::лефортово::backward": "unknown",
  "tunnel:7::рязанский проспект|7::выхино::backward": "unknown",
  "tunnel:7::жулебино|7::котельники::backward": "unknown",
  "tunnel:2::беломорская|2::речной вокзал::backward": "unknown",
  "tunnel:10::яхромская|10::селигерская::forward": "unknown",
  "tunnel:4::пионерская|4::филевский парк::backward": "unknown",
  "tunnel:6::сухаревская|6::тургеневская::forward": "unknown",
  "tunnel:1::библиотека им.ленина|1::кропоткинская::forward": "unknown",
  "tunnel:10::марьино|10::борисово::backward": "unknown",
  "tunnel:7::щукинская|7::октябрьское поле::backward": "unknown",
  "tunnel:7::лермонтовский проспект|7::жулебино::backward": "unknown",
  "tunnel:3::площадь революции|3::арбатская::backward": "unknown",
  "tunnel:8::авиамоторная|8::площадь ильича::forward": "unknown",
  "tunnel:6::медведково|6::бабушкинская::backward": "unknown",
  "tunnel:2::павелецкая|2::автозаводская::forward": "unknown",
  "tunnel:5::курская|5::таганская::backward": "unknown",
  "tunnel:15::нижегородская|15::стахановская::forward": "unknown",
  "tunnel:8A::парк победы|8A::минская::backward": "unknown",
  "tunnel:6::китай-город|6::третьяковская::backward": "unknown",
  "tunnel:1::университет|1::проспект вернадского::backward": "unknown",
  "tunnel:9::улица академика янгеля|9::аннино::backward": "unknown",
  "tunnel:1::комсомольская|1::красные ворота::backward": "safe",
  "tunnel:3::измайловская|3::партизанская::forward": "safe",
  "tunnel:2::войковская|2::сокол::backward": "safe",
  "tunnel:1::спортивная|1::воробьевы горы::forward": "safe",
  "tunnel:5::добрынинская|5::октябрьская::backward": "safe",
  "tunnel:9::боровицкая|9::полянка::backward": "safe",
  "tunnel:4::смоленская|4::арбатская::forward": "safe",
  "tunnel:8A::новопеределкино|8A::рассказовка::backward": "safe",
  "tunnel:9::нагорная|9::нахимовский проспект::forward": "safe",
  "tunnel:1::черкизовская|1::преображенская площадь::backward": "safe",
  "tunnel:16::университет дружбы народов|16::генерала тюленева::forward": "safe",
  "tunnel:9::нагатинская|9::нагорная::backward": "safe",
  "tunnel:8A::мичуринский проспект|8A::озерная::forward": "safe",
  "tunnel:11::каховская|11::варшавская::backward": "safe",
  "tunnel:9::алтуфьево|9::бибирево::forward": "safe",
  "tunnel:2::динамо|2::белорусская::forward": "safe",
  "tunnel:11::варшавская|11::каширская::backward": "safe",
  "tunnel:1::университет|1::проспект вернадского::forward": "safe",
  "tunnel:1::фрунзенская|1::спортивная::forward": "safe",
  "tunnel:10::лианозово|10::яхромская::forward": "safe",
  "tunnel:16::крымская|16::академическая::backward": "safe",
  "tunnel:6::китай-город|6::третьяковская::forward": "safe",
  "tunnel:11::кунцевская|11::давыдково::backward": "safe",
  "tunnel:6::сухаревская|6::тургеневская::backward": "safe",
  "tunnel:1::проспект вернадского|1::юго-западная::backward": "safe",
  "tunnel:7::октябрьское поле|7::полежаевская::backward": "safe",
  "tunnel:16::генерала тюленева|16::тютчевская::backward": "safe",
  "tunnel:4::кунцевская|4::пионерская::forward": "safe",
  "tunnel:5::проспект мира|5::комсомольская::forward": "safe",
  "tunnel:15::косино|15::улица дмитриевского::backward": "safe",
  "tunnel:9::петровско-разумовская|9::тимирязевская::forward": "safe",
  "tunnel:2::царицыно|2::орехово::backward": "safe",
  "tunnel:6::новые черемушки|6::калужская::forward": "safe",
  "tunnel:9::петровско-разумовская|9::тимирязевская::backward": "safe",
  "tunnel:4::деловой центр (выставочная)|4::москва-сити::forward": "safe",
  "tunnel:5::белорусская|5::новослободская::forward": "safe",
  "tunnel:9::полянка|9::серпуховская::backward": "safe",
  "tunnel:3::щелковская|3::первомайская::forward": "safe",
  "tunnel:9::отрадное|9::владыкино::backward": "safe",
  "tunnel:8A::говорово|8A::солнцево::backward": "safe",
  "tunnel:9::менделеевская|9::цветной бульвар::forward": "safe",
  "tunnel:5::комсомольская|5::курская::forward": "safe",
  "tunnel:1::фрунзенская|1::спортивная::backward": "safe",
  "tunnel:8A::мичуринский проспект|8A::озерная::backward": "safe",
  "tunnel:8::перово|8::шоссе энтузиастов::backward": "safe",
  "tunnel:10::кожуховская|10::печатники::forward": "safe",
  "tunnel:7::текстильщики|7::кузьминки::forward": "safe",
  "tunnel:10::петровско-разумовская|10::фонвизинская::forward": "safe",
  "tunnel:12::улица скобелевская|12::улица старокачаловская::forward": "safe",
  "tunnel:4::фили|4::кутузовская::forward": "safe",
  "tunnel:7::спартак|7::щукинская::backward": "safe",
  "tunnel:15::окская|15::юго-восточная::forward": "safe",
  "tunnel:11::кленовый бульвар|11::нагатинский затон::forward": "safe",
  "tunnel:16::корниловская|16::коммунарка::backward": "safe",
  "tunnel:9::чеховская|9::боровицкая::backward": "safe",
  "tunnel:4::кунцевская|4::пионерская::backward": "safe",
  "tunnel:2::тверская|2::театральная::forward": "safe",
  "tunnel:9::серпуховская|9::тульская::backward": "safe",
  "tunnel:6::алексеевская|6::рижская::backward": "safe",
  "tunnel:11::давыдково|11::аминьевская::forward": "safe",
  "tunnel:5::павелецкая|5::добрынинская::backward": "safe",
  "tunnel:2::театральная|2::новокузнецкая::backward": "safe",
  "tunnel:10::люблино|10::братиславская::forward": "safe",
  "tunnel:8::новогиреево|8::перово::backward": "safe",
  "tunnel:10::селигерская|10::верхние лихоборы::backward": "safe",
  "tunnel:11::авиамоторная|11::лефортово::forward": "safe",
  "tunnel:4::филевский парк|4::багратионовская::backward": "safe",
  "tunnel:6::вднх|6::алексеевская::forward": "safe",
  "tunnel:7::улица 1905 года|7::баррикадная::forward": "safe",
  "tunnel:10::лианозово|10::яхромская::backward": "safe",
  "tunnel:10::дубровка|10::кожуховская::backward": "safe",
  "tunnel:6::бабушкинская|6::свиблово::forward": "safe",
  "tunnel:15::стахановская|15::окская::backward": "safe",
  "tunnel:10::люблино|10::братиславская::backward": "safe",
  "tunnel:8A::ломоносовский проспект|8A::раменки::forward": "safe",
  "tunnel:3::крылатское|3::строгино::backward": "safe",
  "tunnel:11::нагатинский затон|11::печатники::backward": "safe",
  "tunnel:1::кропоткинская|1::парк культуры::backward": "safe",
  "tunnel:11::зюзино|11::каховская::backward": "safe",
  "tunnel:3::кунцевская|3::молодежная::forward": "safe",
  "tunnel:10::фонвизинская|10::бутырская::backward": "safe",
  "tunnel:6::тургеневская|6::китай-город::backward": "safe",
  "tunnel:9::чертановская|9::южная::forward": "safe",
  "tunnel:11::хорошевская|11::народное ополчение::forward": "safe",
  "tunnel:5::октябрьская|5::парк культуры::backward": "safe",
  "tunnel:7::выхино|7::лермонтовский проспект::backward": "safe",
  "tunnel:6::тургеневская|6::китай-город::forward": "safe",
  "tunnel:2::белорусская|2::маяковская::forward": "safe",
  "tunnel:8::шоссе энтузиастов|8::авиамоторная::backward": "safe",
  "tunnel:10::селигерская|10::верхние лихоборы::forward": "safe",
  "tunnel:11::хорошевская|11::народное ополчение::backward": "safe",
  "tunnel:3::мякинино|3::волоколамская::forward": "safe",
  "tunnel:3::крылатское|3::строгино::forward": "safe",
  "tunnel:12::бунинская аллея|12::улица горчакова::backward": "safe",
  "tunnel:9::полянка|9::серпуховская::forward": "safe",
  "tunnel:6::ботанический сад|6::вднх::forward": "safe",
  "tunnel:3::молодежная|3::крылатское::backward": "safe",
  "tunnel:1::черкизовская|1::преображенская площадь::forward": "safe",
  "tunnel:11::воронцовская|11::зюзино::backward": "safe",
  "tunnel:4::смоленская|4::арбатская::backward": "safe",
  "tunnel:8A::раменки|8A::мичуринский проспект::forward": "safe",
  "tunnel:16::новаторская|16::университет дружбы народов::forward": "safe",
  "tunnel:15::улица дмитриевского|15::лухмановская::backward": "safe",
  "tunnel:2::технопарк|2::коломенская::backward": "safe",
  "tunnel:7::улица 1905 года|7::баррикадная::backward": "safe",
  "tunnel:1::проспект вернадского|1::юго-западная::forward": "safe",
  "tunnel:10::крестьянская застава|10::дубровка::forward": "safe",
  "tunnel:7::волгоградский проспект|7::текстильщики::backward": "safe",
  "tunnel:2::коломенская|2::каширская::forward": "safe",
  "tunnel:7::пролетарская|7::волгоградский проспект::forward": "safe",
  "tunnel:11::мичуринский проспект|11::проспект вернадского::forward": "safe",
  "tunnel:7::кузьминки|7::рязанский проспект::backward": "safe",
  "tunnel:7::пушкинская|7::кузнецкий мост::backward": "safe",
  "tunnel:10::верхние лихоборы|10::окружная::backward": "safe",
  "tunnel:10::римская|10::крестьянская застава::forward": "safe",
  "tunnel:5::павелецкая|5::добрынинская::forward": "safe",
  "tunnel:10::крестьянская застава|10::дубровка::backward": "safe",
  "tunnel:1::воробьевы горы|1::университет::forward": "safe",
  "tunnel:4::багратионовская|4::фили::forward": "safe",
  "tunnel:7::волгоградский проспект|7::текстильщики::forward": "safe",
  "tunnel:10::борисово|10::шипиловская::backward": "safe",
  "tunnel:6::теплый стан|6::ясенево::forward": "safe",
  "tunnel:11::рижская|11::марьина роща::forward": "safe",
  "tunnel:8A::боровское шоссе|8A::новопеределкино::backward": "safe",
  "tunnel:3::парк победы|3::славянский бульвар::backward": "safe",
  "tunnel:5::парк культуры|5::киевская::backward": "safe",
  "tunnel:1::кропоткинская|1::парк культуры::forward": "safe",
  "tunnel:2::беломорская|2::речной вокзал::forward": "safe",
  "tunnel:16::вавиловская|16::новаторская::forward": "safe",
  "tunnel:6::третьяковская|6::октябрьская::backward": "safe",
  "tunnel:2::домодедовская|2::красногвардейская::forward": "safe",
  "tunnel:10::дубровка|10::кожуховская::forward": "normal",
  "tunnel:9::отрадное|9::владыкино::forward": "normal",
  "tunnel:16::коммунарка|16::новомосковская::forward": "normal",
  "tunnel:8A::парк победы|8A::минская::forward": "normal",
  "tunnel:8A::боровское шоссе|8A::новопеределкино::forward": "normal",
  "tunnel:12::улица старокачаловская|12::лесопарковая::forward": "normal",
  "tunnel:6::академическая|6::профсоюзная::forward": "normal",
  "tunnel:10::печатники|10::волжская::backward": "normal",
  "tunnel:1::тропарево|1::румянцево::backward": "normal",
  "tunnel:2::водный стадион|2::войковская::forward": "normal",
  "tunnel:15::улица дмитриевского|15::лухмановская::forward": "normal",
  "tunnel:12::улица старокачаловская|12::лесопарковая::backward": "normal",
  "tunnel:6::новые черемушки|6::калужская::backward": "normal",
  "tunnel:9::бибирево|9::отрадное::forward": "normal",
  "tunnel:9::нагорная|9::нахимовский проспект::backward": "normal",
  "tunnel:9::южная|9::пражская::forward": "normal",
  "tunnel:2::речной вокзал|2::водный стадион::backward": "normal",
  "tunnel:3::бауманская|3::курская::forward": "normal",
  "tunnel:16::крымская|16::академическая::forward": "normal",
  "tunnel:3::мякинино|3::волоколамская::backward": "normal",
  "tunnel:6::теплый стан|6::ясенево::backward": "normal",
  "tunnel:8A::рассказовка|8A::пыхтино::forward": "normal",
  "tunnel:3::кунцевская|3::молодежная::backward": "normal",
  "tunnel:5::проспект мира|5::комсомольская::backward": "normal",
  "tunnel:1::бульвар рокоссовского|1::черкизовская::forward": "normal",
  "tunnel:9::тимирязевская|9::дмитровская::backward": "normal",
  "tunnel:10::достоевская|10::трубная::forward": "normal",
  "tunnel:7::баррикадная|7::пушкинская::backward": "normal",
  "tunnel:5::добрынинская|5::октябрьская::forward": "normal",
  "tunnel:10::физтех|10::лианозово::forward": "normal",
  "tunnel:16::академическая|16::вавиловская::backward": "normal",
  "tunnel:3::партизанская|3::семеновская::forward": "normal",
  "tunnel:2::войковская|2::сокол::forward": "normal",
  "tunnel:1::библиотека им.ленина|1::кропоткинская::backward": "normal",
  "tunnel:7::рязанский проспект|7::выхино::forward": "normal",
  "tunnel:2::автозаводская|2::технопарк::forward": "normal",
  "tunnel:6::проспект мира|6::сухаревская::forward": "normal",
  "tunnel:1::преображенская площадь|1::сокольники::forward": "normal",
  "tunnel:11::печатники|11::текстильщики::forward": "normal",
  "tunnel:11::цска|11::хорошевская::forward": "normal",
  "tunnel:15::стахановская|15::окская::forward": "normal",
  "tunnel:4::филевский парк|4::багратионовская::forward": "normal",
  "tunnel:2::каширская|2::кантемировская::forward": "normal",
  "tunnel:15::окская|15::юго-восточная::backward": "normal",
  "tunnel:8::новокосино|8::новогиреево::forward": "normal",
  "tunnel:6::коньково|6::теплый стан::backward": "normal",
  "tunnel:5::краснопресненская|5::белорусская::backward": "normal",
  "tunnel:8A::раменки|8A::мичуринский проспект::backward": "normal",
  "tunnel:9::менделеевская|9::цветной бульвар::backward": "normal",
  "tunnel:8::площадь ильича|8::марксистская::forward": "normal",
  "tunnel:10::братиславская|10::марьино::forward": "normal",
  "tunnel:10::окружная|10::петровско-разумовская::forward": "normal",
  "tunnel:11::народное ополчение|11::мневники::backward": "normal",
  "tunnel:4::фили|4::кутузовская::backward": "normal",
  "tunnel:10::римская|10::крестьянская застава::backward": "normal",
  "tunnel:3::бауманская|3::курская::backward": "normal",
  "tunnel:1::румянцево|1::саларьево::forward": "normal",
  "tunnel:11::аминьевская|11::мичуринский проспект::forward": "normal",
  "tunnel:7::щукинская|7::октябрьское поле::forward": "normal",
  "tunnel:7::полежаевская|7::беговая::forward": "normal",
  "tunnel:16::тютчевская|16::корниловская::backward": "normal",
  "tunnel:4::киевская|4::деловой центр (выставочная)::backward": "normal",
  "tunnel:7::сходненская|7::тушинская::backward": "normal",
  "tunnel:3::курская|3::площадь революции::forward": "normal",
  "tunnel:9::тульская|9::нагатинская::forward": "normal",
  "tunnel:6::свиблово|6::ботанический сад::backward": "normal",
  "tunnel:9::нахимовский проспект|9::севастопольская::forward": "normal",
  "tunnel:2::динамо|2::белорусская::backward": "normal",
  "tunnel:9::чертановская|9::южная::backward": "normal",
  "tunnel:6::алексеевская|6::рижская::forward": "normal",
  "tunnel:11::савеловская|11::петровский парк::backward": "normal",
  "tunnel:2::водный стадион|2::войковская::backward": "normal",
  "tunnel:6::коньково|6::теплый стан::forward": "normal",
  "tunnel:6::бабушкинская|6::свиблово::backward": "normal",
  "tunnel:6::рижская|6::проспект мира::backward": "normal",
  "tunnel:6::вднх|6::алексеевская::backward": "normal",
  "tunnel:2::каширская|2::кантемировская::backward": "normal",
  "tunnel:8::марксистская|8::третьяковская::forward": "normal",
  "tunnel:3::арбатская|3::смоленская::backward": "normal",
  "tunnel:5::киевская|5::краснопресненская::forward": "normal",
  "tunnel:12::улица скобелевская|12::улица старокачаловская::backward": "normal",
  "tunnel:7::беговая|7::улица 1905 года::forward": "normal",
  "tunnel:6::проспект мира|6::сухаревская::backward": "normal",
  "tunnel:2::красногвардейская|2::алма-атинская::forward": "normal",
  "tunnel:8A::минская|8A::ломоносовский проспект::forward": "normal",
  "tunnel:12::улица горчакова|12::бульвар адмирала ушакова::forward": "normal",
  "tunnel:11::текстильщики|11::нижегородская::backward": "normal",
  "tunnel:16::корниловская|16::коммунарка::forward": "normal",
  "tunnel:11::лефортово|11::электрозаводская::backward": "normal",
  "tunnel:8::марксистская|8::третьяковская::backward": "normal",
  "tunnel:3::семеновская|3::электрозаводская::backward": "normal",
  "tunnel:10::марьина роща|10::достоевская::backward": "normal",
  "tunnel:10::борисово|10::шипиловская::forward": "normal",
  "tunnel:2::сокол|2::аэропорт::forward": "normal",
  "tunnel:10::физтех|10::лианозово::backward": "normal",
  "tunnel:6::беляево|6::коньково::forward": "normal",
  "tunnel:3::смоленская|3::киевская::forward": "normal",
  "tunnel:8A::ломоносовский проспект|8A::раменки::backward": "normal",
  "tunnel:16::академическая|16::вавиловская::forward": "normal",
  "tunnel:1::лубянка|1::охотный ряд::backward": "normal",
  "tunnel:10::печатники|10::волжская::forward": "normal",
  "tunnel:9::севастопольская|9::чертановская::backward": "normal",
  "tunnel:3::славянский бульвар|3::кунцевская::forward": "normal",
  "tunnel:11::проспект вернадского|11::новаторская::forward": "normal",
  "tunnel:16::коммунарка|16::новомосковская::backward": "normal",
  "tunnel:9::южная|9::пражская::backward": "normal",
  "tunnel:3::первомайская|3::измайловская::forward": "normal",
  "tunnel:5::курская|5::таганская::forward": "normal",
  "tunnel:3::арбатская|3::смоленская::forward": "normal",
  "tunnel:9::пражская|9::улица академика янгеля::backward": "normal",
  "tunnel:11::каховская|11::варшавская::forward": "normal",
  "tunnel:11::нижегородская|11::авиамоторная::backward": "normal",
  "tunnel:1::преображенская площадь|1::сокольники::backward": "normal",
  "tunnel:7::октябрьское поле|7::полежаевская::forward": "normal",
  "tunnel:11::цска|11::хорошевская::backward": "normal",
  "tunnel:11::новаторская|11::воронцовская::backward": "normal",
  "tunnel:6::октябрьская|6::шаболовская::forward": "normal",
  "tunnel:5::таганская|5::павелецкая::backward": "normal",
  "tunnel:2::тверская|2::театральная::backward": "normal",
  "tunnel:11::нижегородская|11::авиамоторная::forward": "normal",
  "tunnel:11::народное ополчение|11::мневники::forward": "normal",
  "tunnel:1::парк культуры|1::фрунзенская::forward": "normal",
  "tunnel:6::ботанический сад|6::вднх::backward": "normal",
  "tunnel:15::нижегородская|15::стахановская::backward": "normal",
  "tunnel:9::нахимовский проспект|9::севастопольская::backward": "normal",
  "tunnel:5::новослободская|5::проспект мира::forward": "normal",
  "tunnel:7::баррикадная|7::пушкинская::forward": "normal",
  "tunnel:11::текстильщики|11::нижегородская::forward": "normal",
  "tunnel:11::новаторская|11::воронцовская::forward": "normal",
  "tunnel:12::лесопарковая|12::битцевский парк::forward": "normal",
  "tunnel:2::речной вокзал|2::водный стадион::forward": "normal",
  "tunnel:8::перово|8::шоссе энтузиастов::forward": "normal",
  "tunnel:12::улица горчакова|12::бульвар адмирала ушакова::backward": "normal",
  "tunnel:8A::озерная|8A::говорово::forward": "normal",
  "tunnel:3::партизанская|3::семеновская::backward": "normal",
  "tunnel:2::маяковская|2::тверская::backward": "normal",
  "tunnel:9::улица академика янгеля|9::аннино::forward": "normal",
  "tunnel:7::спартак|7::щукинская::forward": "normal",
  "tunnel:1::красносельская|1::комсомольская::backward": "normal",
  "tunnel:11::мичуринский проспект|11::проспект вернадского::backward": "normal",
  "tunnel:15::лухмановская|15::некрасовка::backward": "normal",
  "tunnel:11::варшавская|11::каширская::forward": "normal",
  "tunnel:10::бутырская|10::марьина роща::backward": "normal",
  "tunnel:3::митино|3::пятницкое шоссе::forward": "normal",
  "tunnel:4::пионерская|4::филевский парк::forward": "normal",
  "tunnel:1::юго-западная|1::тропарево::backward": "normal",
  "tunnel:3::строгино|3::мякинино::forward": "normal",
  "tunnel:11::каширская|11::кленовый бульвар::forward": "normal",
  "tunnel:2::царицыно|2::орехово::forward": "normal",
  "tunnel:5::новослободская|5::проспект мира::backward": "normal",
  "tunnel:2::технопарк|2::коломенская::forward": "normal",
  "tunnel:15::лухмановская|15::некрасовка::forward": "normal",
  "tunnel:1::филатов луг|1::прокшино::backward": "normal",
  "tunnel:9::владыкино|9::петровско-разумовская::forward": "normal",
  "tunnel:9::аннино|9::бульвар дмитрия донского::forward": "normal",
  "tunnel:9::цветной бульвар|9::чеховская::backward": "normal",
  "tunnel:3::славянский бульвар|3::кунцевская::backward": "normal",
  "tunnel:10::кожуховская|10::печатники::backward": "normal",
  "tunnel:5::таганская|5::павелецкая::forward": "normal",
  "tunnel:7::тушинская|7::спартак::backward": "normal",
  "tunnel:9::севастопольская|9::чертановская::forward": "normal",
  "tunnel:3::митино|3::пятницкое шоссе::backward": "normal",
  "tunnel:11::мневники|11::терехово::backward": "normal",
  "tunnel:2::орехово|2::домодедовская::forward": "normal",
  "tunnel:11::печатники|11::текстильщики::backward": "normal",
  "tunnel:11::аминьевская|11::мичуринский проспект::backward": "normal",
  "tunnel:9::тимирязевская|9::дмитровская::forward": "normal",
  "tunnel:11::воронцовская|11::зюзино::forward": "normal",
  "tunnel:12::бунинская аллея|12::улица горчакова::forward": "normal",
  "tunnel:11::кленовый бульвар|11::нагатинский затон::backward": "normal",
  "tunnel:3::смоленская|3::киевская::backward": "normal",
  "tunnel:7::текстильщики|7::кузьминки::backward": "normal",
  "tunnel:3::первомайская|3::измайловская::backward": "normal",
  "tunnel:2::аэропорт|2::динамо::backward": "normal",
  "tunnel:7::пролетарская|7::волгоградский проспект::backward": "normal",
  "tunnel:4::деловой центр (выставочная)|4::москва-сити::backward": "normal",
  "tunnel:6::академическая|6::профсоюзная::backward": "normal",
  "tunnel:10::достоевская|10::трубная::backward": "normal",
  "tunnel:10::фонвизинская|10::бутырская::forward": "normal",
  "tunnel:8A::солнцево|8A::боровское шоссе::backward": "normal",
  "tunnel:6::ленинский проспект|6::академическая::backward": "normal",
  "tunnel:3::электрозаводская|3::бауманская::backward": "normal",
  "tunnel:7::выхино|7::лермонтовский проспект::forward": "normal",
  "tunnel:16::зил|16::крымская::backward": "normal",
  "tunnel:5::комсомольская|5::курская::backward": "normal",
  "tunnel:7::полежаевская|7::беговая::backward": "normal",
  "tunnel:1::ольховая|1::новомосковская (коммунарка)::forward": "normal",
  "tunnel:3::семеновская|3::электрозаводская::forward": "normal",
  "tunnel:11::нагатинский затон|11::печатники::forward": "normal",
  "tunnel:3::измайловская|3::партизанская::backward": "normal",
  "tunnel:2::театральная|2::новокузнецкая::forward": "normal",
  "tunnel:7::кузьминки|7::рязанский проспект::forward": "normal",
  "tunnel:11::кунцевская|11::давыдково::forward": "normal",
  "tunnel:8A::говорово|8A::солнцево::forward": "normal",
  "tunnel:16::генерала тюленева|16::тютчевская::forward": "normal",
  "tunnel:11::лефортово|11::электрозаводская::forward": "normal",
  "tunnel:5::краснопресненская|5::белорусская::forward": "normal",
  "tunnel:2::сокол|2::аэропорт::backward": "normal",
  "tunnel:6::шаболовская|6::ленинский проспект::forward": "normal",
  "tunnel:1::лубянка|1::охотный ряд::forward": "normal",
  "tunnel:11::электрозаводская|11::сокольники::forward": "normal",
  "tunnel:11::электрозаводская|11::сокольники::backward": "normal",
  "tunnel:12::бульвар адмирала ушакова|12::улица скобелевская::backward": "normal",
  "tunnel:9::владыкино|9::петровско-разумовская::backward": "normal",
  "tunnel:6::рижская|6::проспект мира::forward": "normal",
  "tunnel:11::каширская|11::кленовый бульвар::backward": "normal",
  "tunnel:1::прокшино|1::ольховая::forward": "normal",
  "tunnel:2::домодедовская|2::красногвардейская::backward": "normal",
  "tunnel:2::красногвардейская|2::алма-атинская::backward": "normal",
  "tunnel:9::чеховская|9::боровицкая::forward": "normal",
  "tunnel:10::сретенский бульвар|10::чкаловская::forward": "normal",
  "tunnel:6::калужская|6::беляево::forward": "normal",
  "tunnel:1::спортивная|1::воробьевы горы::backward": "normal",
  "tunnel:8A::рассказовка|8A::пыхтино::backward": "normal",
  "tunnel:1::бульвар рокоссовского|1::черкизовская::backward": "normal",
  "tunnel:9::тульская|9::нагатинская::backward": "normal",
  "tunnel:7::тушинская|7::спартак::forward": "normal",
  "tunnel:4::киевская|4::смоленская::backward": "normal",
  "tunnel:2::маяковская|2::тверская::forward": "normal",
  "tunnel:1::юго-западная|1::тропарево::forward": "normal",
  "tunnel:12::бульвар адмирала ушакова|12::улица скобелевская::forward": "normal",
  "tunnel:3::волоколамская|3::митино::forward": "normal",
  "tunnel:1::филатов луг|1::прокшино::forward": "normal",
  "tunnel:8A::минская|8A::ломоносовский проспект::backward": "normal",
  "tunnel:10::бутырская|10::марьина роща::forward": "normal",
  "tunnel:11::давыдково|11::аминьевская::backward": "normal",
  "tunnel:11::мневники|11::терехово::forward": "normal",
  "tunnel:9::боровицкая|9::полянка::forward": "normal",
  "tunnel:1::воробьевы горы|1::университет::backward": "normal",
  "tunnel:8A::пыхтино|8A::аэропорт внуково::backward": "normal",
  "tunnel:10::шипиловская|10::зябликово::backward": "normal",
  "tunnel:8::шоссе энтузиастов|8::авиамоторная::forward": "normal",
  "tunnel:8A::пыхтино|8A::аэропорт внуково::forward": "normal",
  "tunnel:7::лермонтовский проспект|7::жулебино::forward": "normal",
  "tunnel:15::косино|15::улица дмитриевского::forward": "normal",
  "tunnel:16::тютчевская|16::корниловская::forward": "normal"
} as const;

export const stationResources: Record<string, StationResource> = {
  "1::бульвар рокоссовского": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::черкизовская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::преображенская площадь": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::сокольники": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::красносельская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::комсомольская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::красные ворота": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::чистые пруды": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::лубянка": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "1::охотный ряд": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::библиотека им.ленина": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::кропоткинская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::парк культуры": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::фрунзенская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::спортивная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::воробьевы горы": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::университет": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "1::проспект вернадского": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::юго-западная": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "1::тропарево": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::румянцево": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "1::саларьево": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::филатов луг": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::прокшино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::ольховая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::новомосковская (коммунарка)": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "1::потапово": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::ховрино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::беломорская": {
    "kind": "curiosity",
    "label": "Кукольные маски",
    "icon": "◇",
    "detail": "Отыгрыш: позволяют разыграть чужую легенду на станции."
  },
  "2::речной вокзал": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::водный стадион": {
    "kind": "curiosity",
    "label": "Ложные открытки",
    "icon": "◇",
    "detail": "Отыгрыш: виды Москвы, которой уже не существует."
  },
  "2::войковская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::сокол": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::аэропорт": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::динамо": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::белорусская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::маяковская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::тверская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::театральная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::новокузнецкая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::павелецкая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::автозаводская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::технопарк": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::коломенская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::каширская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "2::кантемировская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::царицыно": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "2::орехово": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::домодедовская": {
    "kind": "curiosity",
    "label": "Грибной чай",
    "icon": "◇",
    "detail": "Отыгрыш: горячий чай из подземных грибов; на механику не влияет."
  },
  "2::красногвардейская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "2::алма-атинская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::щелковская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::первомайская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::измайловская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "3::партизанская": {
    "kind": "curiosity",
    "label": "Театр теней",
    "icon": "◇",
    "detail": "Отыгрыш: короткое представление и слух о соседней ветке."
  },
  "3::семеновская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::электрозаводская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::бауманская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "3::курская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "3::площадь революции": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "3::арбатская": {
    "kind": "curiosity",
    "label": "Сахарные грибы",
    "icon": "◇",
    "detail": "Отыгрыш: редкая сладость без лечебного эффекта."
  },
  "3::смоленская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::киевская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "3::парк победы": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::славянский бульвар": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "3::кунцевская": {
    "kind": "curiosity",
    "label": "Чернильные карты",
    "icon": "◇",
    "detail": "Отыгрыш: красивые, но заведомо неточные схемы метро."
  },
  "3::молодежная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::крылатское": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::строгино": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "3::мякинино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::волоколамская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "3::митино": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "3::пятницкое шоссе": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::кунцевская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::пионерская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "4::филевский парк": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::багратионовская": {
    "kind": "curiosity",
    "label": "Театр теней",
    "icon": "◇",
    "detail": "Отыгрыш: короткое представление и слух о соседней ветке."
  },
  "4::фили": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "4::кутузовская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::студенческая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::киевская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::смоленская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::арбатская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::александровский сад": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::деловой центр (выставочная)": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "4::москва-сити": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "5::новослободская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "5::проспект мира": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "5::комсомольская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "5::курская": {
    "kind": "curiosity",
    "label": "Меловые краски",
    "icon": "◇",
    "detail": "Отыгрыш: можно оставить на простыне одну публичную метку."
  },
  "5::таганская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "5::павелецкая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "5::добрынинская": {
    "kind": "curiosity",
    "label": "Чернильные карты",
    "icon": "◇",
    "detail": "Отыгрыш: красивые, но заведомо неточные схемы метро."
  },
  "5::октябрьская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "5::парк культуры": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "5::киевская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "5::краснопресненская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "5::белорусская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::медведково": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::бабушкинская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "6::свиблово": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "6::ботанический сад": {
    "kind": "curiosity",
    "label": "Бумажные птицы",
    "icon": "◇",
    "detail": "Отыгрыш: местный талисман, не имеющий цены вне станции."
  },
  "6::вднх": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "6::алексеевская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::рижская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::проспект мира": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::сухаревская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "6::тургеневская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::китай-город": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::третьяковская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "6::октябрьская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "6::шаболовская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::ленинский проспект": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::академическая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::профсоюзная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::новые черемушки": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::калужская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "6::беляево": {
    "kind": "curiosity",
    "label": "Кукольные маски",
    "icon": "◇",
    "detail": "Отыгрыш: позволяют разыграть чужую легенду на станции."
  },
  "6::коньково": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::теплый стан": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "6::ясенево": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "6::новоясеневская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::планерная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::сходненская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::тушинская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::спартак": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::щукинская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "7::октябрьское поле": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::полежаевская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::беговая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::улица 1905 года": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::баррикадная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::пушкинская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "7::кузнецкий мост": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "7::китай-город": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::таганская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::пролетарская": {
    "kind": "curiosity",
    "label": "Ложные открытки",
    "icon": "◇",
    "detail": "Отыгрыш: виды Москвы, которой уже не существует."
  },
  "7::волгоградский проспект": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::текстильщики": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::кузьминки": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::рязанский проспект": {
    "kind": "curiosity",
    "label": "Театр теней",
    "icon": "◇",
    "detail": "Отыгрыш: короткое представление и слух о соседней ветке."
  },
  "7::выхино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::лермонтовский проспект": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "7::жулебино": {
    "kind": "curiosity",
    "label": "Ложные открытки",
    "icon": "◇",
    "detail": "Отыгрыш: виды Москвы, которой уже не существует."
  },
  "7::котельники": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8::новокосино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8::новогиреево": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8::перово": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8::шоссе энтузиастов": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8::авиамоторная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8::площадь ильича": {
    "kind": "curiosity",
    "label": "Чернильные карты",
    "icon": "◇",
    "detail": "Отыгрыш: красивые, но заведомо неточные схемы метро."
  },
  "8::марксистская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8::третьяковская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::деловой центр": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::парк победы": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "8A::минская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::ломоносовский проспект": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::раменки": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::мичуринский проспект": {
    "kind": "curiosity",
    "label": "Музыкальный цилиндр",
    "icon": "◇",
    "detail": "Отыгрыш: старая запись; можно обменять на историю NPC."
  },
  "8A::озерная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::говорово": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::солнцево": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::боровское шоссе": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::новопеределкино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::рассказовка": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "8A::пыхтино": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "8A::аэропорт внуково": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::алтуфьево": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::бибирево": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::отрадное": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::владыкино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::петровско-разумовская": {
    "kind": "curiosity",
    "label": "Музыкальный цилиндр",
    "icon": "◇",
    "detail": "Отыгрыш: старая запись; можно обменять на историю NPC."
  },
  "9::тимирязевская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::дмитровская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "9::савеловская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::менделеевская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::цветной бульвар": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "9::чеховская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "9::боровицкая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::полянка": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "9::серпуховская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::тульская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "9::нагатинская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::нагорная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::нахимовский проспект": {
    "kind": "curiosity",
    "label": "Ложные открытки",
    "icon": "◇",
    "detail": "Отыгрыш: виды Москвы, которой уже не существует."
  },
  "9::севастопольская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::чертановская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::южная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::пражская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::улица академика янгеля": {
    "kind": "curiosity",
    "label": "Чернильные карты",
    "icon": "◇",
    "detail": "Отыгрыш: красивые, но заведомо неточные схемы метро."
  },
  "9::аннино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "9::бульвар дмитрия донского": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::физтех": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::лианозово": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "10::яхромская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::селигерская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::верхние лихоборы": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::окружная": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::петровско-разумовская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::фонвизинская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::бутырская": {
    "kind": "curiosity",
    "label": "Музыкальный цилиндр",
    "icon": "◇",
    "detail": "Отыгрыш: старая запись; можно обменять на историю NPC."
  },
  "10::марьина роща": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "10::достоевская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "10::трубная": {
    "kind": "curiosity",
    "label": "Кукольные маски",
    "icon": "◇",
    "detail": "Отыгрыш: позволяют разыграть чужую легенду на станции."
  },
  "10::сретенский бульвар": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::чкаловская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::римская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "10::крестьянская застава": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::дубровка": {
    "kind": "curiosity",
    "label": "Бумажные птицы",
    "icon": "◇",
    "detail": "Отыгрыш: местный талисман, не имеющий цены вне станции."
  },
  "10::кожуховская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::печатники": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "10::волжская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::люблино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::братиславская": {
    "kind": "curiosity",
    "label": "Меловые краски",
    "icon": "◇",
    "detail": "Отыгрыш: можно оставить на простыне одну публичную метку."
  },
  "10::марьино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::борисово": {
    "kind": "curiosity",
    "label": "Бумажные птицы",
    "icon": "◇",
    "detail": "Отыгрыш: местный талисман, не имеющий цены вне станции."
  },
  "10::шипиловская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "10::зябликово": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::мичуринский проспект": {
    "kind": "curiosity",
    "label": "Грибной чай",
    "icon": "◇",
    "detail": "Отыгрыш: горячий чай из подземных грибов; на механику не влияет."
  },
  "11::проспект вернадского": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::новаторская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "11::воронцовская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::зюзино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::каховская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "11::варшавская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::каширская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::кленовый бульвар": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::нагатинский затон": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::печатники": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::текстильщики": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::нижегородская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "11::авиамоторная": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "11::лефортово": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::электрозаводская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "11::сокольники": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "11::рижская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::марьина роща": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::савеловская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "11::петровский парк": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "11::цска": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::хорошевская": {
    "kind": "curiosity",
    "label": "Музыкальный цилиндр",
    "icon": "◇",
    "detail": "Отыгрыш: старая запись; можно обменять на историю NPC."
  },
  "11::народное ополчение": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::мневники": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::терехово": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "11::кунцевская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "11::давыдково": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "11::аминьевская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "11::шелепиха": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "11::деловой центр": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "12::бунинская аллея": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "12::улица горчакова": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "12::бульвар адмирала ушакова": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "12::улица скобелевская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "12::улица старокачаловская": {
    "kind": "medkit",
    "label": "Аптечка",
    "icon": "+",
    "detail": "Два действия «остаться» подряд дают одну аптечку."
  },
  "12::лесопарковая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "12::битцевский парк": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "15::нижегородская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "15::стахановская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "15::окская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "15::юго-восточная": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "15::косино": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "15::улица дмитриевского": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "15::лухмановская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "15::некрасовка": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "16::зил": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "16::крымская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "16::академическая": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "16::вавиловская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "16::новаторская": {
    "kind": "wire",
    "label": "Проволока",
    "icon": "⌁",
    "detail": "Одно действие «остаться» даёт одну ремонтную проволоку."
  },
  "16::университет дружбы народов": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "16::генерала тюленева": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "16::тютчевская": {
    "kind": "curiosity",
    "label": "Ложные открытки",
    "icon": "◇",
    "detail": "Отыгрыш: виды Москвы, которой уже не существует."
  },
  "16::корниловская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "16::коммунарка": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  },
  "16::новомосковская": {
    "kind": "rice",
    "label": "Рис",
    "icon": "•",
    "detail": "Одно действие «остаться» даёт одну рисинку."
  }
};

export const scenarioNpcPositions: Record<string, string> = {
  "npc-01": "8A::пыхтино",
  "npc-02": "3::кунцевская",
  "npc-03": "11::цска",
  "npc-04": "11::сокольники",
  "npc-05": "7::жулебино",
  "npc-06": "12::битцевский парк",
  "npc-07": "12::улица горчакова",
  "npc-08": "11::петровский парк",
  "npc-09": "11::народное ополчение",
  "npc-10": "11::савеловская",
  "npc-11": "11::кунцевская",
  "npc-12": "11::хорошевская",
  "npc-13": "2::домодедовская",
  "npc-14": "11::марьина роща",
  "npc-15": "2::красногвардейская",
  "npc-16": "6::ясенево",
  "npc-17": "10::лианозово",
  "npc-18": "12::бульвар адмирала ушакова",
  "npc-19": "6::беляево",
  "npc-20": "3::партизанская",
  "npc-21": "3::славянский бульвар",
  "npc-22": "4::кунцевская",
  "npc-23": "4::багратионовская",
  "npc-24": "10::борисово",
  "npc-25": "10::братиславская"
};

export const scenarioStartNodeIds = [
  "16::зил",
  "10::кожуховская",
  "9::владыкино",
  "7::волгоградский проспект",
  "11::каширская",
  "8A::озерная",
  "1::саларьево",
  "15::стахановская",
  "2::речной вокзал",
  "8::новогиреево",
  "9::пражская",
  "11::печатники",
  "8A::раменки",
  "7::тушинская",
  "9::тимирязевская",
  "16::университет дружбы народов"
] as const;

export const scenarioStartBriefs: Record<string, { distance: number; history: string; branch: string }> = {
  "16::зил": {
    "distance": 11,
    "history": "На станции «ЗИЛ» стены размечены датами исчезнувших караванов. Последняя метка появилась сама собой и указывает в сторону Полиса.",
    "branch": "Троицкая ветка — новая южная линия с научными убежищами, недостроенными камерами и спорной властью."
  },
  "10::кожуховская": {
    "distance": 11,
    "history": "На станции «Кожуховская» сохранился исправный громкоговоритель. Раз в несколько ночей он произносит имена людей, которых здесь никогда не видели.",
    "branch": "Салатовая ветка — линия вентиляции и подземных ферм, известная служебными обходами."
  },
  "9::владыкино": {
    "distance": 11,
    "history": "На станции «Владыкино» сохранился исправный громкоговоритель. Раз в несколько ночей он произносит имена людей, которых здесь никогда не видели.",
    "branch": "Серая ветка — территория дисциплины, колодцев и картографов; надёжные сведения здесь имеют цену."
  },
  "7::волгоградский проспект": {
    "distance": 11,
    "history": "Станция «Волгоградский проспект» превратила бывший кассовый зал в общий склад. Чужаков здесь кормят один раз, а затем просят выбрать: работать или уходить.",
    "branch": "Фиолетовая ветка — длинная торговая артерия, на которой легко найти попутчика и чужую войну."
  },
  "11::каширская": {
    "distance": 11,
    "history": "Станция «Каширская» стала местом обмена письмами между окраинами. Почтальоны исчезли, но запечатанные конверты продолжают появляться.",
    "branch": "Большое кольцо — новая окружная дорога, где караваны быстры, а власть станций ещё не устоялась."
  },
  "8A::озерная": {
    "distance": 11,
    "history": "На станции «Озёрная» стены размечены датами исчезнувших караванов. Последняя метка появилась сама собой и указывает в сторону Полиса.",
    "branch": "Солнцевская ветка — молодая технологичная линия с автономными системами и запертыми гермозонами."
  },
  "1::саларьево": {
    "distance": 11,
    "history": "На станции «Саларьево» сохранился исправный громкоговоритель. Раз в несколько ночей он произносит имена людей, которых здесь никогда не видели.",
    "branch": "Красная ветка — старая прямая магистраль с крепкими общинами и понятным путём к центру."
  },
  "15::стахановская": {
    "distance": 11,
    "history": "На станции «Стахановская» сохранился исправный громкоговоритель. Раз в несколько ночей он произносит имена людей, которых здесь никогда не видели.",
    "branch": "Розовая ветка знаменита строителями, обходами и частыми обвалами недостроенных камер."
  },
  "2::речной вокзал": {
    "distance": 11,
    "history": "На станции «Речной вокзал» стены размечены датами исчезнувших караванов. Последняя метка появилась сама собой и указывает в сторону Полиса.",
    "branch": "Зелёная ветка — речной торговый путь, где затопления и кордоны постоянно меняют цену дороги."
  },
  "8::новогиреево": {
    "distance": 11,
    "history": "На станции «Новогиреево» стены размечены датами исчезнувших караванов. Последняя метка появилась сама собой и указывает в сторону Полиса.",
    "branch": "Жёлтая ветка знаменита рынками, белыми патронами-«рисом» и короткими дорогами к центру."
  },
  "9::пражская": {
    "distance": 11,
    "history": "На станции «Пражская» выжившие оборудовали длинную общую спальню. Всем снится один и тот же центральный зал, хотя никто из них не бывал в Полисе.",
    "branch": "Серая ветка — территория дисциплины, колодцев и картографов; надёжные сведения здесь имеют цену."
  },
  "11::печатники": {
    "distance": 11,
    "history": "На станции «Печатники» стены размечены датами исчезнувших караванов. Последняя метка появилась сама собой и указывает в сторону Полиса.",
    "branch": "Большое кольцо — новая окружная дорога, где караваны быстры, а власть станций ещё не устоялась."
  },
  "8A::раменки": {
    "distance": 11,
    "history": "На станции «Раменки» выжившие оборудовали длинную общую спальню. Всем снится один и тот же центральный зал, хотя никто из них не бывал в Полисе.",
    "branch": "Солнцевская ветка — молодая технологичная линия с автономными системами и запертыми гермозонами."
  },
  "7::тушинская": {
    "distance": 11,
    "history": "На станции «Тушинская» выжившие оборудовали длинную общую спальню. Всем снится один и тот же центральный зал, хотя никто из них не бывал в Полисе.",
    "branch": "Фиолетовая ветка — длинная торговая артерия, на которой легко найти попутчика и чужую войну."
  },
  "9::тимирязевская": {
    "distance": 11,
    "history": "Станция «Тимирязевская» стала местом обмена письмами между окраинами. Почтальоны исчезли, но запечатанные конверты продолжают появляться.",
    "branch": "Серая ветка — территория дисциплины, колодцев и картографов; надёжные сведения здесь имеют цену."
  },
  "16::университет дружбы народов": {
    "distance": 11,
    "history": "На станции «Университет дружбы народов» сохранился исправный громкоговоритель. Раз в несколько ночей он произносит имена людей, которых здесь никогда не видели.",
    "branch": "Троицкая ветка — новая южная линия с научными убежищами, недостроенными камерами и спорной властью."
  }
};

export const scenarioSummary = {
  "stations": 275,
  "physicalEdges": 262,
  "fullyClosedEdges": 26,
  "closedTracks": 52,
  "unknownTracks": 105,
  "safeTracks": 131,
  "normalTracks": 236,
  "resources": {
    "rice": 192,
    "medkit": 28,
    "wire": 28,
    "curiosity": 27
  }
} as const;
