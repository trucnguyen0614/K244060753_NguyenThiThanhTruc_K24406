/* GK - admin.js : Câu 8 (Đăng nhập + Dashboard Admin) */
var employees = [], customers = [], products = [], orders = [];
var pending = 4, dataReady = false;

function money(n) { return "$" + Number(n).toFixed(2); }
function getText(node, tag) {
  var n = node.getElementsByTagName(tag)[0];
  return (n && n.childNodes[0]) ? n.childNodes[0].nodeValue : "";
}
function loadXML(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      callback(new DOMParser().parseFromString(xhr.responseText, "text/xml"));
    }
  };
  xhr.open("GET", url, true); xhr.send();
}
function loadJSON(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) callback(JSON.parse(xhr.responseText));
  };
  xhr.open("GET", url, true); xhr.send();
}
function done() {
  pending--;
  if (pending == 0) {
    dataReady = true;
    // gộp đơn hàng: carts.xml (đã nạp) + đơn mới trong localStorage
    var local = [];
    try { local = JSON.parse(localStorage.getItem("orders")) || []; } catch (e) { local = []; }
    for (var i = 0; i < local.length; i++) orders.push(local[i]);
    if (localStorage.getItem("adminLogin")) showDashboard();
  }
}
function parseCarts(xml) {
  var carts = xml.getElementsByTagName("cart");
  for (var i = 0; i < carts.length; i++) {
    var c = carts[i], items = [], total = 0;
    var its = c.getElementsByTagName("item");
    for (var j = 0; j < its.length; j++) {
      var it = {
        product_id: getText(its[j], "product_id"), product_name: getText(its[j], "product_name"),
        color: getText(its[j], "color"), size: getText(its[j], "size"),
        quantity: parseInt(getText(its[j], "quantity")), price: parseFloat(getText(its[j], "price"))
      };
      total += it.quantity * it.price;
      items.push(it);
    }
    orders.push({ cart_id: getText(c, "cart_id"), date: getText(c, "date"), employee_id: getText(c, "employee_id"),
      customer_id: getText(c, "customer_id"), items: items, total: total });
  }
}
function parseProducts(xml) {
  var nodes = xml.getElementsByTagName("product");
  for (var i = 0; i < nodes.length; i++) {
    products.push({ id: getText(nodes[i], "id"), title: getText(nodes[i], "title"), price: parseFloat(getText(nodes[i], "price")),
      color: getText(nodes[i], "color"), size: getText(nodes[i], "size"), stock: parseInt(getText(nodes[i], "stock")) });
  }
}
function customerName(o) {
  if (o.customer_name) return o.customer_name + " (" + o.customer_id + ")";
  for (var i = 0; i < customers.length; i++) { if (customers[i].id == o.customer_id) return customers[i].name + " (" + o.customer_id + ")"; }
  return o.customer_id;
}
function employeeName(id) {
  if (id == "WEB") return "Website (online)";
  for (var i = 0; i < employees.length; i++) { if (employees[i].id == id) return employees[i].name + " (" + id + ")"; }
  return id;
}

/* ---------- Dashboard ---------- */
function showDashboard() {
  var user = JSON.parse(localStorage.getItem("adminLogin"));
  document.getElementById("loginBox").hidden = true;
  document.getElementById("dashboard").hidden = false;
  document.getElementById("btnLogout").hidden = false;
  document.getElementById("whoami").textContent = "Xin chào, " + user.name;
  renderStats(); renderOrders(); renderItems();
}
function renderStats() {
  var revenue = 0, qty = 0;
  for (var i = 0; i < orders.length; i++) {
    revenue += orders[i].total;
    for (var j = 0; j < orders[i].items.length; j++) qty += orders[i].items[j].quantity;
  }
  document.getElementById("tab-stats").innerHTML =
    '<h2>Thống kê đơn hàng</h2><br><div class="stat-cards">' +
    '<div class="stat-card">Tổng số đơn hàng<b>' + orders.length + '</b></div>' +
    '<div class="stat-card">Tổng doanh thu<b>' + money(revenue) + '</b></div>' +
    '<div class="stat-card">Số lượng sản phẩm đã bán<b>' + qty + '</b></div></div>';
}
function renderOrders() {
  var html = '<h2>Quản lý đơn hàng</h2><table class="data-table"><tr><th>Mã HĐ</th><th>Ngày tạo</th><th>Khách hàng</th><th>Nhân viên</th><th>Tổng tiền</th><th>Chi tiết</th></tr>';
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    html += '<tr><td>' + o.cart_id + '</td><td>' + o.date + '</td><td>' + customerName(o) + '</td><td>' + employeeName(o.employee_id) +
      '</td><td>' + money(o.total) + '</td><td><button class="btn-primary" data-idx="' + i + '">Xem chi tiết</button></td></tr>';
  }
  document.getElementById("tab-orders").innerHTML = html + '</table>';
}
function renderItems() {
  var sold = {};
  for (var i = 0; i < orders.length; i++) {
    for (var j = 0; j < orders[i].items.length; j++) {
      var it = orders[i].items[j];
      if (!sold[it.product_id]) sold[it.product_id] = { name: it.product_name, qty: 0, revenue: 0 };
      sold[it.product_id].qty += it.quantity;
      sold[it.product_id].revenue += it.quantity * it.price;
    }
  }
  var html = '<h2>Sản phẩm đã bán</h2><table class="data-table"><tr><th>Mã SP</th><th>Tên sản phẩm</th><th>Số lượng bán</th><th>Doanh thu</th></tr>';
  for (var pid in sold) html += '<tr><td>' + pid + '</td><td>' + sold[pid].name + '</td><td>' + sold[pid].qty + '</td><td>' + money(sold[pid].revenue) + '</td></tr>';
  html += '</table><br><h2>Tồn kho (products.xml)</h2><table class="data-table"><tr><th>Mã SP</th><th>Tên sản phẩm</th><th>Màu</th><th>Size</th><th>Tồn kho</th><th>Đã bán</th><th>Còn lại</th></tr>';
  for (var k = 0; k < products.length; k++) {
    var p = products[k], s = sold[p.id] ? sold[p.id].qty : 0;
    html += '<tr><td>' + p.id + '</td><td>' + p.title + '</td><td>' + p.color + '</td><td>' + p.size + '</td><td>' + p.stock +
      '</td><td>' + s + '</td><td>' + Math.max(0, p.stock - s) + '</td></tr>';
  }
  document.getElementById("tab-items").innerHTML = html + '</table>';
}
function showOrderDetail(idx) {
  var o = orders[idx];
  var html = '<h2>Hóa đơn ' + o.cart_id + '</h2><p>Ngày: ' + o.date + ' | Khách: ' + customerName(o) + ' | NV: ' + employeeName(o.employee_id) + '</p>';
  if (o.address) html += '<p>Giao đến: ' + o.address + ' - ' + (o.phone || "") + '</p>';
  html += '<table class="data-table"><tr><th>Mã SP</th><th>Tên</th><th>Màu</th><th>Size</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>';
  for (var i = 0; i < o.items.length; i++) {
    var it = o.items[i];
    html += '<tr><td>' + it.product_id + '</td><td>' + it.product_name + '</td><td>' + it.color + '</td><td>' + it.size + '</td><td>' + it.quantity +
      '</td><td>' + money(it.price) + '</td><td>' + money(it.price * it.quantity) + '</td></tr>';
  }
  document.getElementById("detailBody").innerHTML = html + '</table><p class="cart-total">Tổng: ' + money(o.total) + '</p>';
  document.getElementById("detailModal").hidden = false;
}

/* ---------- Khởi tạo ---------- */
window.onload = function () {
  loadJSON("../json/employees.json", function (d) { employees = d; done(); });
  loadJSON("../json/customers.json", function (d) { customers = d; done(); });
  loadXML("../xml/products.xml", function (x) { parseProducts(x); done(); });
  loadXML("../xml/carts.xml", function (x) { parseCarts(x); done(); });

  document.getElementById("loginForm").onsubmit = function (e) {
    e.preventDefault();
    var msg = document.getElementById("loginMsg");
    if (!dataReady) { msg.textContent = "Đang tải dữ liệu, thử lại sau giây lát..."; return; }
    var u = document.getElementById("username").value.trim(), p = document.getElementById("password").value;
    for (var i = 0; i < employees.length; i++) {
      if (employees[i].username == u && employees[i].password == p) {
        localStorage.setItem("adminLogin", JSON.stringify({ id: employees[i].id, name: employees[i].name, role: employees[i].role }));
        msg.textContent = ""; showDashboard(); return;
      }
    }
    msg.textContent = "Sai tên đăng nhập hoặc mật khẩu!";
  };
  document.getElementById("btnLogout").onclick = function () {
    localStorage.removeItem("adminLogin"); location.reload();
  };
  document.getElementById("tabs").onclick = function (e) {
    var tab = e.target.getAttribute("data-tab");
    if (!tab) return;
    var names = ["stats", "orders", "items"], btns = this.querySelectorAll(".tab-btn");
    for (var i = 0; i < names.length; i++) {
      document.getElementById("tab-" + names[i]).hidden = (names[i] != tab);
      btns[i].className = "tab-btn" + (names[i] == tab ? " active" : "");
    }
  };
  document.getElementById("tab-orders").onclick = function (e) {
    var idx = e.target.getAttribute("data-idx");
    if (idx !== null) showOrderDetail(parseInt(idx));
  };
  document.getElementById("detailModal").onclick = function (e) {
    if (e.target === this || e.target.hasAttribute("data-close")) this.hidden = true;
  };
};
