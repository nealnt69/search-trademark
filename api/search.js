var express = require("express");
var router = express.Router();
const cheerio = require("cheerio");

const axios = require("axios");

const globalSession = require("../global/session");

let keys = [
  "XcGMu7hCC0226gQGw3yRWJQJksuYUhLX",
  "8FxJB9oy4izoKfeyHSUSizO7b1eTHDaM",
  "lr0BdqQWHlqAJ81yw6m9TbC8aYHSPhU2",
  "fIePsCUpYnokEsQfl1vhlZsZER1E5Qnq",
];

const getDataLink1 = async (cookie, sesion, search) => {
  return axios({
    url: `http://tmsearch.uspto.gov/bin/showfield?f=toc&state=${sesion}&p_search=searchss&p_L=50&BackReference=&p_plural=yes&p_s_PARA1=&p_tagrepl%7E%3A=PARA1%24LD&expr=PARA1+AND+PARA2&p_s_PARA2=${search}&p_tagrepl%7E%3A=PARA2%24COMB&p_op_ALL=ADJ&a_default=search&a_search=Submit+Query&a_search=Submit+Query`,
    method: "get",
    headers: {
      Cookie: `${cookie};`,
    },
  }).then((response) => {
    return response.data;
  });
};

const getDataLink2 = async (cookie, sesion, search) => {
  return axios({
    url: `http://tmsearch.uspto.gov/bin/showfield?f=toc&state=${sesion}&p_search=searchstr&BackReference=&p_L=500&p_plural=yes&p_s_PARA1=${search}&p_tagrepl%7E%3A=PARA1%24FM&expr=PARA1+and+PARA2&p_s_PARA2=shirts&p_tagrepl%7E%3A=PARA1%24GS&a_default=search&f=toc&state=${sesion}&a_search=Submit+Query`,
    method: "get",
    headers: {
      Cookie: `${cookie};`,
    },
  }).then((response) => response.data);
};

const getCookie = async () => {
  return axios({
    url: "http://tmsearch.uspto.gov",
    method: "get",
    withCredentials: true,
  }).then((response) => response.headers["set-cookie"]);
};

const getSession = async (cookie) => {
  return axios({
    url: "http://tmsearch.uspto.gov",
    method: "get",
    headers: {
      Cookie: cookie,
    },
  }).then((response) => response.data);
};

const saveGlobal = async () => {
  const cookie = (await getCookie()).map((i) => i.split(";")[0]).join("; ");
  const session = await getSession(cookie);
  const dom = session.match(
    /<\s*a[^>]*>(Basic Word Mark Search.*)<\s*\/\s*a>/gi
  );
  const $ = cheerio.load(dom[0]);

  globalSession.setCookie(cookie);
  globalSession.setSession($("a").attr("href").split("state=")[1]);
};

const getHtmlCrawl1 = async (textSearch) => {
  return getDataLink1(
    globalSession.getCookie(),
    globalSession.getSession(),
    textSearch
  );
};

const getHtmlCrawl2 = async (textSearch) => {
  return getDataLink2(
    globalSession.getCookie(),
    globalSession.getSession(),
    textSearch
  );
};

const getCount = (html) => {
  const countString = html
    .match(/(.*?This page: 1 ~ 50.*?)<\s*\/\s*font>/gi)[0]
    .split(" ")[0];
  return +countString;
};

const getDataCrawl = (html) => {
  if (html.includes("FOOTER END")) {
    const listSeri = html.match(/<\s*a[^>]*>([0-9]{8})<\s*\/\s*a>/gi);
    if (listSeri) {
      return listSeri.map(function (val) {
        return val.replace(/<\s*a[^>]*>|<\/?a>/gi, "");
      });
    } else {
      const $ = cheerio.load(html);
      const seri = $(" b:contains(Serial Number)").parent().next().text();
      if (seri) {
        return [seri];
      } else {
        return [];
      }
    }
  } else {
    return [];
  }
};

const getDetailSeri = async (ids) => {
  return axios({
    url: `https://tsdrapi.uspto.gov/ts/cd/caseMultiStatus/sn?ids=${ids}`,
    method: "get",
    headers: {
      "USPTO-API-KEY": keys[0],
    },
  }).then((response) => {
    let removeFirstKey = keys.shift();
    keys.push(removeFirstKey);
    return response.data;
  });
};

const filterData = (dataJson, textSearch, filter, childSearchList) => {
  let listResult = [];
  for (const data of dataJson) {
    if (data.trademark) {
      if (
        !filter.some(
          (e) => e.trim().toLowerCase() === data.trademark.trim().toLowerCase()
        )
      ) {
        if (
          data.trademark &&
          (data.trademark.toLowerCase() === textSearch ||
            textSearch.split(" ").includes(data.trademark.toLowerCase()) ||
            childSearchList.includes(data.trademark.toLowerCase())) &&
          data.des.match(/shirts|shirt/gi)
        ) {
          listResult.push(data);
        }
      }
    }
  }
  return listResult;

  // return dataJson.filter((data) => {
  //   if (
  //     !filter.some(
  //       (e) => e.trim().toLowerCase() === data.trademark.trim().toLowerCase()
  //     )
  //   ) {
  //     return (
  //       data.trademark &&
  //       (data.trademark.toLowerCase() === textSearch ||
  //         textSearch.split(" ").includes(data.trademark.toLowerCase()) ||
  //         childSearchList.includes(data.trademark.toLowerCase())) &&
  //       data.des.match(/shirts/gi)
  //     );
  //   } else {
  //     return false;
  //   }
  // });
};

const splitString = (str) => {
  const childSearchList = [str.trim()];
  const arrText = str.trim().split(" ");

  if (arrText.length > 2) {
    for (let index = 0; index < arrText.length - 1; index++) {
      childSearchList.push(`${arrText[index]} ${arrText[index + 1]}`.trim());
    }
  }

  if (arrText.length > 3) {
    for (let index = 0; index < arrText.length - 2; index++) {
      childSearchList.push(
        `${arrText[index]} ${arrText[index + 1]} ${arrText[index + 2]}`.trim()
      );
    }
  }

  return childSearchList;
};

router.post("/", async function (req, res, next) {
  const { text, page, filter } = req.body;
  let textSearch = text.trim().replace(/\s+/g, " ").toLowerCase();
  const arrSplit = textSearch.split(",");
  const childSearchList = arrSplit.map((item) => splitString(item)).flat();

  if (!textSearch) {
    res.status(200).json({ status: "error" });
  } else {
    try {
      const htmlCrawl1 = await getHtmlCrawl2(textSearch);

      const htmlCrawl2 = await getHtmlCrawl1(textSearch);
      const listHtmlCrawl = [];

      for (const child of childSearchList) {
        const html = await getHtmlCrawl1(child);
        listHtmlCrawl.push(html);
      }

      if (
        !htmlCrawl1.includes("FOOTER END") &&
        !htmlCrawl2.includes("FOOTER END")
      ) {
        await saveGlobal();

        const htmlCrawlNew1 = await getHtmlCrawl2(textSearch);
        const htmlCrawlNew2 = await getHtmlCrawl1(textSearch);
        const listHtmlCrawlNew = [];

        for (const child of childSearchList) {
          const html = await getHtmlCrawl1(child);
          listHtmlCrawlNew.push(html);
        }

        let listSeriMerge = Array.from(
          new Set([
            ...getDataCrawl(htmlCrawlNew1),
            ...getDataCrawl(htmlCrawlNew2),
            ...listHtmlCrawlNew.map((item) => getDataCrawl(item)).flat(),
          ])
        );

        try {
          let listSplice = [];

          while (listSeriMerge.length > 0) {
            listSplice.push(listSeriMerge.splice(0, 25).join(","));
          }

          const detailListSeri = await Promise.all(
            listSplice.map((ids) => getDetailSeri(ids))
          );

          const mergeDetail = detailListSeri
            .map((item) => item.transactionList)
            .flat();

          const dataJson = mergeDetail.map((item) => ({
            serial: item.trademarks[0].status.serialNumber,
            trademark: item.trademarks[0].status.markElement,
            status: item.trademarks[0].status.tm5StatusDesc.split("/")[0],
            type:
              item.trademarks[0].status.markDrawingCd == "4" ||
              item.trademarks[0].status.markDrawingCd == "1"
                ? "Text"
                : "Design",
            fieldOn: item.trademarks[0].status.filingDate,
            registerDate: item.trademarks[0].publication.datePublished,
            des: item.trademarks[0].gsList
              .map((item) => item.description)
              .join(" "),
          }));

          const filterDataJson = filterData(
            dataJson,
            textSearch,
            filter,
            childSearchList
          );

          res.json({
            tradeMarks: filterDataJson.slice((page - 1) * 25, page * 25),
            status: "ok",
          });
        } catch (error) {
          res.json({ status: "error" });
        }
      } else {
        let listSeriMerge = Array.from(
          new Set([
            ...getDataCrawl(htmlCrawl1),
            ...getDataCrawl(htmlCrawl2),
            ...listHtmlCrawl.map((item) => getDataCrawl(item)).flat(),
          ])
        );

        try {
          let listSplice = [];

          while (listSeriMerge.length > 0) {
            listSplice.push(listSeriMerge.splice(0, 25).join(","));
          }

          const detailListSeri = await Promise.all(
            listSplice.map((ids) => getDetailSeri(ids))
          );

          const mergeDetail = detailListSeri
            .map((item) => item.transactionList)
            .flat();

          const dataJson = mergeDetail.map((item) => ({
            serial: item.trademarks[0].status.serialNumber,
            trademark: item.trademarks[0].status.markElement,
            status: item.trademarks[0].status.tm5StatusDesc.split("/")[0],
            type:
              item.trademarks[0].status.markDrawingCd == "4" ||
              item.trademarks[0].status.markDrawingCd == "1"
                ? "Text"
                : "Design",
            fieldOn: item.trademarks[0].status.filingDate,
            registerDate: item.trademarks[0].publication.datePublished,
            des: item.trademarks[0].gsList
              .map((item) => item.description)
              .join(" "),
          }));

          const filterDataJson = filterData(
            dataJson,
            textSearch,
            filter,
            childSearchList
          );

          res.json({
            tradeMarks: filterDataJson.slice((page - 1) * 25, page * 25),
            status: "ok",
          });
        } catch (error) {
          res.json();
        }
        res.json({ status: "error" });
      }
    } catch (error) {}

    res.end();
  }
});

module.exports = router;
