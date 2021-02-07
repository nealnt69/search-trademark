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
    url: `http://tmsearch.uspto.gov/bin/showfield?f=toc&state=${sesion}&p_search=searchstr&BackReference=&p_L=500&p_plural=yes&p_s_PARA1=${search}&p_tagrepl%7E%3A=PARA1%24FM&expr=PARA1+and+PARA2&p_s_PARA2=clothing%2C+dress%2C+shirt&p_tagrepl%7E%3A=PARA1%24GS&a_default=search&f=toc&state=${sesion}&a_search=Submit+Query`,
    method: "get",
    headers: {
      Cookie: `${cookie};`,
    },
  }).then((response) => response.data);
};

const getPage = async (cookie, session, jump) => {
  return axios({
    url: `http://tmsearch.uspto.gov/bin/jumpto?f=toc&state=${session}&jumpto=${jump}`,
    method: "get",
    headers: {
      Cookie: `${cookie};`,
    },
  }).then((response) => response.data);

}

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
  console.log("cookie", cookie, "session", cookie)
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
    .match(/(.*?This page: 1 ~.*?)<\s*\/\s*Font>/g)
  if (countString) {
    return countString[0]
      .split(" ")[0] * 1;
  }
  else {
    return 0
  }
};



const getDataCrawl = (html) => {
  if (html.includes("FOOTER END")) {
    const listSeri = html.match(/<\s*TD[^>]*><\s*a[^>]*>([0-9]{8})<\s*\/\s*a><\s*\/\s*TD>/gi);
    if (listSeri) {
      return listSeri.map(function (val) {
        return val.replace(/(<\s*a[^>]*>|<\/?a>)|(<\s*td[^>]*>|<\/?td>)/gi, "");
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

const getSeriFromPage = (html, filter) => {
  const listSeri = html.match(/<\s*TD[^>]*><\s*a[^>]*>([0-9]{8})<\s*\/\s*a><\s*\/\s*TD>/gi);
  const listTradeMark = html.match(/<\s*TD[^>]*><\s*a[^>]*>(?!(\s|LIVE|DEAD|[0-9]{7}))(.*)<\s*\/\s*a><\s*\/\s*TD>/gi);
  console.log(listSeri, listTradeMark)
  if (listSeri) {
    let newListSeri = []
    for (let index = 0; index < listSeri.length; index++) {
      if (listTradeMark[index] && listTradeMark[index].replace(/(<\s*a[^>]*>|<\/?a>)|(<\s*b[^>]*>|<\/?b>)|(<\s*td[^>]*>|<\/?td>)/gi, "").replace(/\s+/g, " ").toUpperCase() === filter.toUpperCase()) {
        newListSeri.push(listSeri[index].replace(/(<\s*a[^>]*>|<\/?a>)|(<\s*td[^>]*>|<\/?td>)/gi, ""))
      }
    }
    return newListSeri
  } else {
    return null;
  }
}


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
  }).catch(error => console.log(error));
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
          data.des.match(/shirts|shirt|t-shirt|tshirt|clothing/gi)
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
  const { text, page, filter, key, keyDate } = req.body;
  let textSearch = text.trim().replace(/\s+/g, " ").toLowerCase();
  const arrSplit = textSearch.split(",");
  const childSearchList = arrSplit.map((item) => splitString(item)).flat();
  const listKeyValid = key.filter((item, index) => { return new Date(keyDate[index]) > new Date() });
  if (listKeyValid && listKeyValid.length > 0) {
    keys = listKeyValid
  }

  console.log("start")
  let stopGetCookie = 0;

  while (stopGetCookie === 0) {
    try {
      await saveGlobal();
      stopGetCookie++
    } catch (error) {
      stopGetCookie++

    }
  }





  if (!textSearch) {
    res.status(200).json({ status: "error" });
  } else {
    try {
      // const htmlCrawl1 = await getHtmlCrawl2(textSearch);

      // const htmlCrawl2 = await getHtmlCrawl1(textSearch);


      // if (
      //   !htmlCrawl1.includes("FOOTER END") &&
      //   !htmlCrawl2.includes("FOOTER END")
      // ) {

      // const htmlCrawlNew1 = await getHtmlCrawl2(textSearch);
      // const htmlCrawlNew2 = await getHtmlCrawl1(textSearch);
      const listHtmlCrawlNew = [];

      const listSeriPageNew = []

      for (const child of childSearchList) {
        try {
          // let html = await getHtmlCrawl1(child);
          let count = getCount(html);
          let listLoadPage = []
          let whileLoopStop = 0;
          let indexSession = 1;
          while (whileLoopStop === 0) {
            console.log(indexSession)
            if (count > 50) {

              for (let index = 1; index < 10 && index * 50 <= 500; index++) {
                let loadPage = await getPage(globalSession.getCookie(),
                  globalSession.getSession().slice(0, -3) + indexSession + ".1", index * 50 + 1);
                listLoadPage.push(loadPage)
              }
              try {
                let listHtmlLoadPage = await Promise.all(listLoadPage);
                let listSeriEachChild = listHtmlLoadPage.map(item => getSeriFromPage(item, child));
                if (listSeriEachChild.every(element => element === null) && indexSession < 10) {
                  indexSession++
                }
                else {
                  console.log(listSeriEachChild)
                  listSeriPageNew.push(...listSeriEachChild.flat().filter(item => item !== null));
                  whileLoopStop++
                }
              } catch (error) {
                console.log(error)
              }
            }
            else {
              whileLoopStop++
            }


          }
          listHtmlCrawlNew.push(html);
        } catch (error) {
          console.log(error)
        }
      }


      let listSeriMerge = Array.from(
        new Set([
          // ...getDataCrawl(htmlCrawlNew1),
          // ...getDataCrawl(htmlCrawlNew2),
          ...listSeriPageNew,
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


        const dataJson = mergeDetail.map((item) => {
          return {
            serial: item.trademarks[0].status.serialNumber,
            trademark: item.trademarks[0].status.markElement,
            status: item.trademarks[0].status.tm5StatusDesc.split("/")[0],
            type:
              item.trademarks[0].status.markDrawingCd == "4" ||
                item.trademarks[0].status.markDrawingCd == "1"
                ? "Text"
                : "Design",
            fieldOn: item.trademarks[0].status.filingDate,
            registerDate:
              item.trademarks[0].status.usRegistrationNumber != ""
                ? item.trademarks[0].status.usRegistrationDate
                : "Chưa đăng ký",
            des: item.trademarks[0].gsList
              .map((item) => item.description)
              .join(" "),
          };
        });

        const filterDataJson = filterData(
          dataJson,
          textSearch,
          filter,
          childSearchList
        );

        res.json({
          tradeMarks: filterDataJson,
          status: "ok",
        });
      } catch (error) {
        console.log(error)
        res.json({ status: "error", err: error });

      }
      // } else {
      //   const listHtmlCrawl = [];


      //   const listSeriPage = [];



      //   for (const child of childSearchList) {
      //     try {
      //       const html = await getHtmlCrawl1(child);
      //       let count = getCount(html);
      //       let listLoadPage = [];
      //       let whileLoopStop = 0;
      //       let indexSession = 1;
      //       while (whileLoopStop === 0) {
      //         console.log(indexSession)
      //         if (count > 50) {

      //           for (let index = 1; index < 10 && index * 50 <= 500; index++) {
      //             let loadPage = await getPage(globalSession.getCookie(),
      //               globalSession.getSession().slice(0, -3) + indexSession + ".1", index * 50 + 1);
      //             listLoadPage.push(loadPage)
      //           }
      //           try {
      //             let listHtmlLoadPage = await Promise.all(listLoadPage);
      //             let listSeriEachChild = listHtmlLoadPage.map(item => getSeriFromPage(item, child));
      //             if (listSeriEachChild.every(element => element === null) && indexSession < 10) {
      //               indexSession++
      //             }
      //             else {
      //               console.log(listSeriEachChild)

      //               listSeriPage.push(...listSeriEachChild.flat().filter(item => item !== null));
      //               whileLoopStop++
      //             }
      //           } catch (error) {
      //             console.log(error)
      //           }
      //         }
      //         else {
      //           whileLoopStop++
      //         }


      //       }
      //       listHtmlCrawl.push(html);
      //     } catch (error) {
      //       console.log(error)
      //     }
      //   }

      //   let listSeriMerge = Array.from(
      //     new Set([
      //       ...getDataCrawl(htmlCrawl1),
      //       ...getDataCrawl(htmlCrawl2),
      //       ...listSeriPage,
      //     ])
      //   );


      //   try {
      //     let listSplice = [];

      //     while (listSeriMerge.length > 0) {
      //       listSplice.push(listSeriMerge.splice(0, 25).join(","));
      //     }

      //     const detailListSeri = await Promise.all(
      //       listSplice.map((ids) => getDetailSeri(ids))
      //     );


      //     const mergeDetail = detailListSeri
      //       .map((item) => item.transactionList)
      //       .flat();

      //     const dataJson = mergeDetail.map((item) => ({
      //       serial: item.trademarks[0].status.serialNumber,
      //       trademark: item.trademarks[0].status.markElement,
      //       status: item.trademarks[0].status.tm5StatusDesc.split("/")[0],
      //       type:
      //         item.trademarks[0].status.markDrawingCd == "4" ||
      //           item.trademarks[0].status.markDrawingCd == "1"
      //           ? "Text"
      //           : "Design",
      //       fieldOn: item.trademarks[0].status.filingDate,
      //       registerDate:
      //         item.trademarks[0].status.usRegistrationNumber != ""
      //           ? item.trademarks[0].status.usRegistrationDate
      //           : "Chưa đăng ký",
      //       des: item.trademarks[0].gsList
      //         .map((item) => item.description)
      //         .join(" "),
      //     }));

      //     const filterDataJson = filterData(
      //       dataJson,
      //       textSearch,
      //       filter,
      //       childSearchList
      //     );

      //     res.json({
      //       tradeMarks: filterDataJson,
      //       status: "ok",
      //     });
      //   } catch (error) {
      //     console.log(error)
      //     res.json({ status: "error", err: error });

      //   }

      // }
    } catch (error) {
      console.log(error)
      res.end();
    }
  }
});

module.exports = router;
