// Get saved data from sessionStorage
var $rowID = sessionStorage.getItem('rowid');
if($rowID == "" || $rowID == null){
    window.location.href = "index.html";
}