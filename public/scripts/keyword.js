const fileTrademark = document.getElementById("file-trademark");
const listTrademark = $("#list-trademark")
let listKeyword = []

$(document).ready(function () {

    let key = JSON.parse(window.localStorage.getItem("list-trademark"));

    if (key) {
        let contentTable = key.map(
            (item, index) =>
                ` <tr>
          <td class="text-center text-muted index">
            ${index + 1}
      </td>
          <td class="text-center text-muted key" >
             ${item}
          </td>
          <td class="text-center ">
          </td>
          
        </tr>`
        )

        $("#table-body-key").html(contentTable)
    }

})

$(document).ready(function () {

    $("#btn-save").on("click", () => {
        localStorage.setItem("list-trademark", JSON.stringify(listKeyword));
        window.location.reload()
    })


    fileTrademark.addEventListener("change", handleFileTrademark, false);


})


const handleFileTrademark = (e) => {
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
            if (objectSheet.hasOwnProperty(key)) {
                const element = objectSheet[key];
                if (element.w) {
                    keywordFilter.push(`${element.w}`);
                }
            } else {
                keyStart++;
            }
        }

        listKeyword = keywordFilter;

        listTrademark.html(
            keywordFilter.map(
                (item) => `
            <span class="badge badge-pill badge-success" style='color:white;'>
              ${item}
            </span>
          `
            )
        );

    };
    reader.readAsArrayBuffer(f);
};