type ResponseItem = {
    topic: string;
    title: string;
    description: string;
    location: string;
    city: string;
    formattedFetchDate: string;
    dateTime: string[];
}
type Response = {
    items: ResponseItem[]
    html: () => Promise<string>
}

const findValue = ({cookie, key}: { cookie: string, key: string }) => {
    const regex = new RegExp(`${key.replaceAll("-", "\\-")}=[a-zA-Z\\d-_]*;`)
    return regex.exec(cookie)![0].replace(";", "").split("=")[1];
}


const nextDay = (dayOfWeek: number) => {
    const now = new Date();
    const date = new Date();
    date.setDate(now.getDate() + (dayOfWeek + (7 - now.getDay())) % 7);
    return date;
}

const format = (date: Date) => {
    const da = new Intl.DateTimeFormat('en', {day: '2-digit'}).format(date);
    const mo = new Intl.DateTimeFormat('en', {month: '2-digit'}).format(date);
    const ye = new Intl.DateTimeFormat('en', {year: 'numeric'}).format(date);
    return `${da}.${mo}.${ye}`;
}

interface Param {
    dayOfWeek: number
}

export const fetchKaenguruData = async (param: Param): Promise<Response> => {

    const initial = await fetch("https://www.kaenguru-online.de/kalender");
    const cookie = initial.headers.get("set-cookie")!;

    const formattedFetchDate = format(nextDay(param.dayOfWeek));
    const parsedCookies = {
        PHPSESSID: findValue({cookie, key: "PHPSESSID"}),
        "csrf_https-contao_csrf_token": findValue({cookie, key: "csrf_https-contao_csrf_token"})
    }


    const form = new FormData();
    form.append('event_filter[defaults][needle]', "");
    form.append('event_filter[defaults][category]', "");
    form.append('event_filter[dateFrom]', formattedFetchDate);
    form.append('event_filter[dateTo]', formattedFetchDate);
    form.append('event_filter[defaults][zip]', "");
    form.append('event_filter[defaults][city]', "");
    form.append('event_filter[defaults][radius]', "2");
    form.append('event_filter[age]', "");
    form.append('event_filter[defaults][submit]', "");
    form.append('REQUEST_TOKEN', parsedCookies["csrf_https-contao_csrf_token"]);


    const cookieForRequests = Object.entries(parsedCookies)
        .map(([key, value]) => `${key}=${value}`)
        .join(";")

    await fetch("https://www.kaenguru-online.de/kalender", {
        method: 'POST',
        body: form,
        headers: {
            cookie: cookieForRequests
        }
    });

    const getResponse = await fetch("https://www.kaenguru-online.de/kalender?offset=0&limit=80&count=22", {
        method: 'GET',
        headers: {
            cookie: cookieForRequests
        }
    });

    const onText = (fn: (str: string) => void) => {
        let chunk = '';
        return (text: Text) => {
            const str = text.text.trim();
            if (text.lastInTextNode) {
                fn(chunk + str);
                chunk = "";
            } else {
                chunk += str;
            }
        };
    };

    const stateHolder = (() => {
        let idx = -1;
        const arr: ResponseItem[] = []

        return {
            newEntry: () => {
                idx+=1;
                arr[idx]= {
                    formattedFetchDate,
                    topic: '',
                    title: '',
                    description: '',
                    dateTime: [],
                    location: '',
                    city: ''
                };
            },
            get: () => arr,
            topic: (topic: string) => {
                arr[idx] = {...arr[idx], topic};
            },
            title: (title: string) => {
                arr[idx] = {...arr[idx], title};
            },
            description: (description: string) => {
                arr[idx] = {...arr[idx], description};
            },
            dateTime: (dateTime: string) => {
                if(dateTime === ""){
                    return;
                }
                // @ts-ignore
                arr[idx] = {...arr[idx], dateTime: [...arr[idx].dateTime, dateTime]};
            },
            location: (location: string) => {
                arr[idx] = {...arr[idx], location};
            },
            city: (city: string) => {
                arr[idx] = {...arr[idx], city};
            }
        };
    })()


    await new HTMLRewriter()
        .on('div[itemtype="http://schema.org/Event"] .mainCategoryMark a', {
            element(element) {
                const val = element.getAttribute("title");
                if (val === null) {
                    return;
                }
                stateHolder.newEntry();
                stateHolder.topic(val);
            },
        })
        .on('div[itemtype="http://schema.org/Event"] .text a[itemprop="url"]', {
            text: onText(stateHolder.title)
        })
        .on('div[itemtype="http://schema.org/Event"] [itemprop="teaser"]', {
            text: onText(stateHolder.description)
        })
        .on('div[itemtype="http://schema.org/Event"] .subtitle.dateTime:not([itemprop])', {
          text: onText(stateHolder.dateTime)
        })
        .on('div[itemtype="http://schema.org/Event"] [itemprop="customer"] [itemprop="name"]', {
            text: onText(stateHolder.location)
        })
        .on('div[itemtype="http://schema.org/Event"] [itemprop="location"] [itemprop="name"]', {
            text: onText(stateHolder.city)
        })
        .transform(getResponse.clone())
        .text();

    return {
        items: stateHolder.get(),
        html: async () => getResponse.text()
    }
}

export type FetchKaenguruData = typeof fetchKaenguruData