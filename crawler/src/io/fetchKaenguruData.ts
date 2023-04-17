
type Response = string;

const findValue = ({cookie, key}: {cookie: string, key: string}) => {
  const regex = new RegExp(`${key.replaceAll("-", "\\-")}=[a-zA-Z\\d-_]*;`)
  return regex.exec(cookie)![0].replace(";", "").split("=")[1];
}

export const fetchKaenguruData = async (): Promise<Response> => {

  const initial = await fetch("https://www.kaenguru-online.de/kalender");
  const cookie = initial.headers.get("set-cookie")!;

  const parsedCookies = {
    PHPSESSID: findValue({cookie, key: "PHPSESSID"}),
    "csrf_https-contao_csrf_token": findValue({cookie, key: "csrf_https-contao_csrf_token"})
  }


  const form = new FormData();
  form.append('event_filter[defaults][needle]', "");
  form.append('event_filter[defaults][category]', "");
  form.append('event_filter[dateFrom]', "21.04.2023");
  form.append('event_filter[dateTo]', "21.04.2023");
  form.append('event_filter[defaults][zip]', "");
  form.append('event_filter[defaults][city]', "");
  form.append('event_filter[defaults][radius]', "2");
  form.append('event_filter[age]', "");
  form.append('event_filter[defaults][submit]', "");
  form.append('REQUEST_TOKEN', parsedCookies["csrf_https-contao_csrf_token"]);


  const cookieForRequests = Object.entries(parsedCookies)
      .map(([key, value]) => `${key}=${value}`)
      .join(";")

  const postResponse = await fetch("https://www.kaenguru-online.de/kalender", {
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
  // [itemtype="http://schema.org/Event"]
  // @ts-ignore
  const arr = [];
  let newResponse = new HTMLRewriter()
      .on('div', {
        element(element) {
          console.log(element);
          arr.push(element);
        },
      })
      .transform(getResponse);
  console.log(newResponse);
  // @ts-ignore
  console.log(arr.join("").toString());
  return "hello"
}

export type FetchKaenguruData = typeof fetchKaenguruData