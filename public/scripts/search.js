const btnSearch = document.getElementById("btn-search");
const textSearch = document.getElementById("text-search");
const fileExclude = document.getElementById("file-exclude");
const tableBodyTradeMark = document.getElementById("table-body-trade-mark");
const btnLoadMore = $("#load-more");
const listFilter = $("#list-filter");
const btnReset = $("#reset");
const btnLogin = $("#btn-login");
const username = $("#username");
const password = $("#password");
const textCount = $("#text-count");
const splash = $("#splash");

const filterLocalStorage = localStorage.getItem("filter-search");
const usernameLocal = localStorage.getItem("username");
const passwordLocal = localStorage.getItem("password");
if (usernameLocal === "admin" && passwordLocal === "123456") {
  $("#login-modal").css("display", "none");
}

splash.css("display", "none");

let textSearching = "";
let pageSearching = 1;
let count = 0;

let listTradeMark = [];

let countdownInterval;

$(document).ready(function () {
  if (filterLocalStorage) {
    listFilter.html(
      JSON.parse(filterLocalStorage).map(
        (item) => `
          <span class="badge badge-pill badge-danger" style='color:white;'>
            ${item}
          </span>
        `
      )
    );
  }

  let timeCountDownSearch = localStorage.getItem("last-search");
  if (timeCountDownSearch && new Date() - new Date(timeCountDownSearch) < 30000) {
    $("#btn-search").css("display", "none");
    $("#time").css("display", "block");
    let dur = 30 - Math.ceil((new Date() - new Date(timeCountDownSearch)) / 1000),
      display = document.querySelector('#time');
    startTimer(dur, display);
  }

  btnSearch.addEventListener("click", () => {
    textSearching = textSearch.value;
    pageSearching = 1;
    getData(1);
  });
  textSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      textSearching = textSearch.value;
      pageSearching = 1;
      getData(1);
    }
  });

  $(document).on("mouseenter", "td.trademark-type", function (event) {
    $(this).children("div").css("display", "block");
  });
  $(document).on("mouseleave", "td.trademark-type", function (event) {
    $(this).children("div").css("display", "none");
  });

  fileExclude.addEventListener("change", handleFile, false);

  btnReset.on("click", () => {
    listFilter.html("");
    localStorage.removeItem("filter-search");
  });

  btnLogin.on("click", () => {
    if (username.val() === "admin" && password.val() === "123456") {
      localStorage.setItem("username", username.val());
      localStorage.setItem("password", password.val());
      $("#login-modal").css("display", "none");
    } else {
      username.val("");
      password.val("");
      $("#error-login").css("display", "block");
    }
  });


  $("#filter-status").on("change", function (e) {
    switch ($(this).val()) {
      case "all":
        render(listTradeMark)
        break;
      case "live":
        render(listTradeMark.filter(item => item.status === "LIVE"));
        break;
      case "dead":
        render(listTradeMark.filter(item => item.status === "DEAD"));
        break;
      default:
        break;
    }
  })

});

const handleFile = (e) => {
  var files = e.target.files,
    f = files[0];
  var reader = new FileReader();
  reader.onload = function (e) {
    var data = new Uint8Array(e.target.result);
    var workbook = XLSX.read(data, { type: "array" });

    const objectSheet = workbook.Sheets[Object.keys(workbook.Sheets)[0]];

    const keywordFilter = [];
    let keyStart = 0;

    for (const key in objectSheet) {
      if (objectSheet.hasOwnProperty(key) && keyStart > 1) {
        const element = objectSheet[key];
        if (element.w) {
          keywordFilter.push(`${element.w}`);
        }
      } else {
        keyStart++;
      }
    }

    listFilter.html(
      keywordFilter.map(
        (item) => `
          <span class="badge badge-pill badge-danger" style='color:white;'>
            ${item}
          </span>
        `
      )
    );

    localStorage.setItem("filter-search", JSON.stringify(keywordFilter));
  };
  reader.readAsArrayBuffer(f);
};

btnLoadMore.on("click", () => {
  pageSearching++;
  getData(pageSearching, "loadMore");
});

const render = tradeMarks => {

  let keyword = JSON.parse(window.localStorage.getItem("list-trademark")) || [];
 

  let contentTable = `${keyword.filter(i => textSearching.includes(i))
    .map(
      (item) =>
        ` <tr>
<td class="text-center text-muted">
</td>
<td class="text-center">
   ${item}
</td>
<td class="text-center">
  <div class="btn btn-sm btn-success"
        ">LIVE</div>
</td>
<td class="text-center">
  <div class="btn btn-sm"
        ">Text</div>
</td>
<td class="text-center">
</td>
<td class="text-center">

</td>
</tr>`
    )
    .join("")} ${tradeMarks
      .map(
        (item) =>
          ` <tr>
<td class="text-center text-muted">
<a href='https://tsdr.uspto.gov/#caseNumber=${item.serial
          }&caseType=SERIAL_NO&searchType=statusSearch' target='_blank' >${item.serial
          }</a></td>
<td class="text-center">
   ${item.trademark}
</td>
<td class="text-center">
  <div class="btn btn-sm  ${item.status === "LIVE" ? "btn-success" : "btn-danger"
          }">${item.status}</div>
</td>
<td class="text-center ${item.type === "Design" ? "text-info" : "text-secondary"
          } trademark-type" style="position:relative;cursor:pointer" >${item.type}
<div style="position:absolute;right:100%;top:50%;transform:translate(0%, -50%);z-index:9999;box-shadow:0 1rem 3rem rgba(0,0,0,.175)!important;border-radius:0.25rem;display:none" class='image'><img alt='${item.trademark
          }' src='https://tsdr.uspto.gov/img/${item.serial}/large' /></div>
</td>
<td class="text-center">
   ${item.fieldOn}
</td>
<td class="text-center">
${item.registerDate || "Chưa đăng ký"}
</td>
</tr>`
      )
      .join("")}`;

  tableBodyTradeMark.innerHTML = contentTable;
}

const getData = async (page, type = "search") => {

  let timeLastSearch = localStorage.getItem('last-search');
  if (!timeLastSearch || new Date() - new Date(timeLastSearch) > 30000) {
    localStorage.removeItem("last-search")
    $("#filter-status").val("all")
    try {
      const filterLocalStorage = localStorage.getItem("filter-search");
      const key = JSON.parse(window.localStorage.getItem("key"))
      const keyDate = JSON.parse(window.localStorage.getItem("date"))
      $("#loading").css("display", "flex");
      const res = await axios({
        method: "post",
        url: `/api/search`,
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          text: textSearching,
          page,
          filter: filterLocalStorage ? JSON.parse(filterLocalStorage) : [],
          key,
          keyDate
        },
        timeout: 60000,
      });

      localStorage.setItem("last-search", new Date());
      $("#btn-search").css("display", "none");
      $("#time").css("display", "block");
      let dur = 30,
        display = document.querySelector('#time');
      startTimer(dur, display);


      setTimeout(() => {
        $("#loading").css("display", "none");
      }, 500);

      if (res && res.data.status === "ok") {
        const tradeMarks = res.data.tradeMarks;

        // if (tradeMarks.length === 25) {
        //   btnLoadMore.css("display", "block");
        // } else {
        //   btnLoadMore.css("display", "none");
        // }

        let contentTable = "";

        if (type === "search") {
          count = tradeMarks.length;
          listTradeMark = tradeMarks;

          render(tradeMarks)

          //     contentTable = tradeMarks
          //       .map(
          //         (item) =>
          //           ` <tr>
          //     <td class="text-center text-muted">
          //     <a href='https://tsdr.uspto.gov/#caseNumber=${item.serial
          //           }&caseType=SERIAL_NO&searchType=statusSearch' target='_blank' >${item.serial
          //           }</a></td>
          //     <td class="text-center">
          //        ${item.trademark}
          //     </td>
          //     <td class="text-center">
          //       <div class="btn btn-sm  ${item.status === "LIVE" ? "btn-success" : "btn-danger"
          //           }">${item.status}</div>
          //     </td>
          //     <td class="text-center ${item.type === "Design" ? "text-info" : "text-secondary"
          //           } trademark-type" style="position:relative;cursor:pointer" >${item.type}
          //     <div style="position:absolute;right:100%;top:50%;transform:translate(0%, -50%);z-index:9999;box-shadow:0 1rem 3rem rgba(0,0,0,.175)!important;border-radius:0.25rem;display:none" class='image'><img alt='${item.trademark
          //           }' src='https://tsdr.uspto.gov/img/${item.serial}/large' /></div>
          //     </td>
          //     <td class="text-center">
          //        ${item.fieldOn}
          //     </td>
          //     <td class="text-center">
          //     ${item.registerDate || "Chưa đăng ký"}
          //  </td>
          //   </tr>`
          //       )
          //       .join("");
          textCount.html(count);
        } else {
          count += tradeMarks.length;
          contentTable = `${tableBodyTradeMark.innerHTML} ${tradeMarks
            .map(
              (item) =>
                ` <tr>
            <td class="text-center text-muted">
            <a href='https://tsdr.uspto.gov/#caseNumber=${item.serial
                }&caseType=SERIAL_NO&searchType=statusSearch' target='_blank' >${item.serial
                }</a></td>
            <td class="text-center">
               ${item.trademark}
            </td>
            <td class="text-center">
              <div class="btn btn-sm  ${item.status === "LIVE" ? "btn-success" : "btn-danger"
                }">${item.status}</div>
            </td>
            <td class="text-center ${item.type === "Design" ? "text-info" : "text-secondary"
                } trademark-type" style="position:relative;cursor:pointer" >${item.type
                }
            <div style="position:absolute;right:100%;top:50%;transform:translate(0%, -50%);z-index:9999;box-shadow:0 1rem 3rem rgba(0,0,0,.175)!important;border-radius:0.25rem;display:none" class='image'><img alt='${item.trademark
                }' src='https://tsdr.uspto.gov/img/${item.serial}/large' /></div>
            </td>
            <td class="text-center">
               ${item.fieldOn}
            </td>
            <td class="text-center">
            ${item.registerDate || "Chưa đăng ký"}
         </td>
          </tr>`
            )
            .join("")}`;
          textCount.html(count);
        }

        // tableBodyTradeMark.innerHTML = contentTable;
      } else {
        // tableBodyTradeMark.innerHTML = "";
      }
    } catch (error) {
      tableBodyTradeMark.innerHTML = "";
      $("#loading").css("display", "none");
      console.log(error);
    }
  }
  else {

  }
};

(function ($) {
  "use strict";

  /*==================================================================
  [ Validate ]*/
  var input = $(".validate-input .input100");

  $(".validate-form").on("submit", function () {
    var check = true;

    for (var i = 0; i < input.length; i++) {
      if (validate(input[i]) == false) {
        showValidate(input[i]);
        check = false;
      }
    }

    return check;
  });

  $(".validate-form .input100").each(function () {
    $(this).focus(function () {
      hideValidate(this);
    });
  });

  function validate(input) {
    if ($(input).attr("type") == "email" || $(input).attr("name") == "email") {
      if (
        $(input)
          .val()
          .trim()
          .match(
            /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{1,5}|[0-9]{1,3})(\]?)$/
          ) == null
      ) {
        return false;
      }
    } else {
      if ($(input).val().trim() == "") {
        return false;
      }
    }
  }

  function showValidate(input) {
    var thisAlert = $(input).parent();

    $(thisAlert).addClass("alert-validate");
  }

  function hideValidate(input) {
    var thisAlert = $(input).parent();

    $(thisAlert).removeClass("alert-validate");
  }

  /*==================================================================
  [ Show pass ]*/
  var showPass = 0;
  $(".btn-show-pass").on("click", function () {
    if (showPass == 0) {
      $(this).next("input").attr("type", "text");
      $(this).find("i").removeClass("fa-eye");
      $(this).find("i").addClass("fa-eye-slash");
      showPass = 1;
    } else {
      $(this).next("input").attr("type", "password");
      $(this).find("i").removeClass("fa-eye-slash");
      $(this).find("i").addClass("fa-eye");
      showPass = 0;
    }
  });
})(jQuery);


function startTimer(duration, display) {
  let timer = duration - 1, minutes, seconds;
  display.textContent = "00:" + duration;
  countdownInterval = setInterval(function () {
    minutes = parseInt(timer / 60, 10);
    seconds = parseInt(timer % 60, 10);

    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    display.textContent = minutes + ":" + seconds;

    if (--timer < 0) {
      clearInterval(countdownInterval);
      $("#btn-search").css("display", "block");
      $("#time").css("display", "none");
    }

  }, 1000);
}

