$(document).ready(function () {

    let key = JSON.parse(window.localStorage.getItem("key"));
    let date = JSON.parse(window.localStorage.getItem("date"));

    if (key && date) {
        let contentTable = key.map(
            (item, index) =>
                ` <tr>
          <td class="text-center text-muted index">
            ${index + 1}
      </td>
          <td class="text-center text-muted key" style=${new Date(date[index]) < new Date() ? "color:red!important" : (((new Date(date[index]) - new Date()) / (1000 * 3600 * 24) <= 7) ? "color:#e6e613!important" : "color:black!important")}>
             ${item}
          </td>
          <td class="text-center text-muted date">
             ${date[index]}
          </td>
          <td class="text-center ">
          <i class="fa fa-pencil icon-edit" aria-hidden="true" style="cursor:pointer;margin-right:12px"></i>
          <i class="fa fa-trash-o icon-delete" aria-hidden="true" style="cursor:pointer;color:red"></i>
          </td>
          
        </tr>`
        )

        $("#table-body-key").html(contentTable)
    }

    $(document).on("click", ".icon-edit", function (e) {
        const index = parseInt($(this).closest("tr").find("td.index").html().trim());
        const key = $(this).closest("tr").find("td.key").html().trim();
        const date = $(this).closest("tr").find("td.date").html().trim();
        $("#key").val(key)
        $("#date").val(date);
        $("#btn-save").hide();
        $("#btn-edit").show()
        $("#btn-edit").on("click", function (e) {
            let dateEdit = $("#date").val()
            const formatDate = new Date(dateEdit)
            if ($("#key").val() && formatDate.getTime()) {
                let keyStorage = JSON.parse(window.localStorage.getItem("key"));
                let dateStorage = JSON.parse(window.localStorage.getItem("date"));
                keyStorage[index - 1] = $("#key").val();
                dateStorage[index - 1] = $("#date").val();
                window.localStorage.setItem("key", JSON.stringify(keyStorage))
                window.localStorage.setItem("date", JSON.stringify(dateStorage))
                window.location.reload()
            }
            else {
                alert("Vui lòng nhập đầy đủ thông tin")

            }
        })
    })

    $(document).on("click", ".icon-delete", function (e) {
        let check = window.confirm("Bạn có chắc muốn xóa");

        if (check) {
            const index = parseInt($(this).closest("tr").find("td.index").html().trim());
            const key = $(this).closest("tr").find("td.key").html().trim();
            const date = $(this).closest("tr").find("td.date").html().trim();
            let keyStorage = JSON.parse(window.localStorage.getItem("key"));
            let dateStorage = JSON.parse(window.localStorage.getItem("date"));
            keyStorage.splice(index - 1, 1)
            dateStorage.splice(index - 1, 1);
            window.localStorage.setItem("key", JSON.stringify(keyStorage))
            window.localStorage.setItem("date", JSON.stringify(dateStorage))
            window.location.reload()
        }
    })

})

$(document).ready(function () {

    $("#btn-save").on("click", () => {
        const keyVal = $("#key").val();
        const dateVal = $("#date").val();
        const formatDate = new Date(dateVal)
        if (keyVal && dateVal && formatDate.getTime()) {
            let key = JSON.parse(window.localStorage.getItem("key"));
            let date = JSON.parse(window.localStorage.getItem("date"));
            console.log(key, date)
            if (!key) {
                const newKey = [keyVal];
                window.localStorage.setItem("key", JSON.stringify(newKey))
            }
            else {
                key.push(keyVal);
                window.localStorage.setItem("key", JSON.stringify(key))

            }


            if (!date) {
                const newDate = [dateVal];
                window.localStorage.setItem("date", JSON.stringify(newDate))

            }
            else {
                date.push(dateVal);
                window.localStorage.setItem("date", JSON.stringify(date))
            }
            window.location.reload()
        }
        else {
            alert("Vui lòng nhập đầy đủ thông tin")
        }
    })

})