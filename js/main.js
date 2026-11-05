/* GK - main.js : xử lý trang index.html (Câu 1 -> Câu 7) */
var products = [];      // danh sách sản phẩm đọc từ xml/products.xml
var reviews = [];       // danh sách đánh giá đọc từ xml/reviews.xml
var customers = [];     // khách hàng đọc từ json/customers.json
var avgRatings = {};    // điểm TB theo product_id
var ready = { skeleton: false, products: false, reviews: false };
var PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='100%' height='100%' fill='#eee'/><text x='50%' y='50%' text-anchor='middle' fill='#999' font-size='20'>No image</text></svg>");

/* ---------- Tiện ích ---------- */
function imgErr(img) { img.onerror = null; img.src = PLACEHOLDER; }
function money(n) { return "$" + Number(n).toFixed(2); }
function getText(node, tag) {
  var n = node.getElementsByTagName(tag)[0];
  return (n && n.childNodes[0]) ? n.childNodes[0].nodeValue : "";
}
function splitList(s) {
  var arr = s.split(","), out = [];
  for (var i = 0; i < arr.length; i++) { if (arr[i].trim() !== "") out.push(arr[i].trim()); }
  return out;
}
function findProduct(id) {
  for (var i = 0; i < products.length; i++) { if (products[i].id == id) return products[i]; }
  return null;
}
function showToast(msg) {
  var t = document.getElementById("toast");
  t.textContent = msg; t.hidden = false;
  setTimeout(function () { t.hidden = true; }, 1800);
}
function showModal(id) { document.getElementById(id).hidden = false; }
function hideModal(id) { document.getElementById(id).hidden = true; }

/* ---------- AJAX bằng XMLHttpRequest ---------- */
function loadXML(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      var parser = new DOMParser();
      var xml = parser.parseFromString(xhr.responseText, "text/xml");
      callback(xml);
    } else if (xhr.readyState == 4) {
      document.getElementById("productList").innerHTML = "<p>Không tải được " + url + ". Hãy chạy bằng Live Server / GitHub Pages.</p>";
    }
  };
  xhr.open("GET", url, true);
  xhr.send();
}
function loadJSON(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) { callback(JSON.parse(xhr.responseText)); }
  };
  xhr.open("GET", url, true);
  xhr.send();
}

/* ---------- Câu 1: Đồng bộ API -> XML ---------- */
function syncApiToXml() {
  fetch("https://fakestoreapi.com/products")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var doc = document.implementation.createDocument("", "products", null);
      var root = doc.documentElement;
      var colors = ["Đỏ", "Xanh", "Đen", "Trắng"], sizes = ["S", "M", "L"];
      function add(parent, tag, val) {
        var e = doc.createElement(tag);
        e.appendChild(doc.createTextNode(val));
        parent.appendChild(e);
        return e;
      }
      for (var i = 0; i < data.length; i++) {
        var p = data[i], el = doc.createElement("product");
        add(el, "id", p.id); add(el, "title", p.title); add(el, "price", p.price);
        add(el, "description", p.description); add(el, "category", p.category); add(el, "image", p.image);
        var r = doc.createElement("rating");
        add(r, "rate", p.rating.rate); add(r, "count", p.rating.count);
        el.appendChild(r);
        add(el, "color", colors[i % 4] + ", " + colors[(i + 1) % 4]);   // bổ sung màu
        add(el, "size", sizes.join(", "));                              // bổ sung size
        add(el, "stock", 10 + (i * 7) % 50);                            // bổ sung tồn kho
        root.appendChild(el);
      }
      var xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc);
      var blob = new Blob([xmlStr], { type: "application/xml" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "products.xml";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      showToast("Đã tải products.xml (" + data.length + " sản phẩm)");
    })
    .catch(function () { alert("Không gọi được fakestoreapi.com"); });
}

/* ---------- Đọc & parse XML ---------- */
function parseProducts(xml) {
  var nodes = xml.getElementsByTagName("product");
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    products.push({
      id: getText(n, "id"), title: getText(n, "title"), price: parseFloat(getText(n, "price")),
      description: getText(n, "description"), category: getText(n, "category"), image: getText(n, "image"),
      rate: parseFloat(getText(n, "rate")), count: getText(n, "count"),
      colors: splitList(getText(n, "color")), sizes: splitList(getText(n, "size")),
      stock: parseInt(getText(n, "stock"))
    });
  }
}
// Câu 5: đọc reviews.xml, tính điểm trung bình theo product_id
function parseReviews(xml) {
  var nodes = xml.getElementsByTagName("review"), sum = {}, cnt = {};
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    var rv = {
      review_id: getText(n, "review_id"), product_id: getText(n, "product_id"),
      customer_id: getText(n, "customer_id"), customer_name: getText(n, "customer_name"),
      rating: parseInt(getText(n, "rating")), comment: getText(n, "comment"), date: getText(n, "date")
    };
    reviews.push(rv);
    sum[rv.product_id] = (sum[rv.product_id] || 0) + rv.rating;
    cnt[rv.product_id] = (cnt[rv.product_id] || 0) + 1;
  }
  for (var pid in sum) { avgRatings[pid] = sum[pid] / cnt[pid]; }
}
function addRatingBadges() {
  for (var i = 0; i < products.length; i++) {
    var wrap = document.getElementById("img-" + products[i].id);
    if (!wrap) continue;
    var span = document.createElement("span");
    span.className = "rating-badge";
    var avg = avgRatings[products[i].id];
    span.innerHTML = "⭐ " + (avg ? avg.toFixed(1) : "--");
    wrap.appendChild(span);
  }
}

/* ---------- Câu 3: Skeleton + render ---------- */
function showSkeleton() {
  var html = "";
  for (var i = 0; i < 8; i++) {
    html += '<div class="skeleton-card"><div class="sk-img"></div><div class="sk-line"></div><div class="sk-line short"></div><div class="sk-line"></div></div>';
  }
  document.getElementById("productList").innerHTML = html;
}
function tryRender() {
  if (ready.skeleton && ready.products && ready.reviews) { applyFilter(); }
}
function renderProducts(list) {
  var box = document.getElementById("productList");
  box.innerHTML = "";
  document.getElementById("resultInfo").textContent = "Tìm thấy " + list.length + " sản phẩm";
  if (list.length == 0) { box.innerHTML = "<p>Không có sản phẩm phù hợp.</p>"; return; }
  for (var i = 0; i < list.length; i++) {
    var p = list[i], co = "", so = "";
    for (var c = 0; c < p.colors.length; c++) co += '<option value="' + p.colors[c] + '">' + p.colors[c] + '</option>';
    for (var s = 0; s < p.sizes.length; s++) so += '<option value="' + p.sizes[s] + '">' + p.sizes[s] + '</option>';
    var variant = p.colors[0] + "|" + p.sizes[0];
    var art = document.createElement("article");
    art.className = "product-card";
    art.setAttribute("data-id", p.id);
    art.innerHTML =
      '<div class="img-wrap" id="img-' + p.id + '"><img src="' + p.image + '" alt="' + p.title + '" onerror="imgErr(this)"></div>' +
      '<h3>' + p.title + '</h3>' +
      '<div class="price">' + money(p.price) + '</div>' +
      '<div class="stock">Tồn kho: ' + p.stock + '</div>' +
      '<div class="variants"><select class="sel-color">' + co + '</select><select class="sel-size">' + so + '</select></div>' +
      '<div class="card-actions">' +
        '<button class="btn-add" data-action="add" data-id="' + p.id + '" data-variant="' + variant + '">Thêm vào giỏ hàng</button>' +
        '<button class="btn-quick" data-action="quick" data-id="' + p.id + '" data-variant="' + variant + '">Xem nhanh</button>' +
      '</div>' +
      '<button class="btn-link" data-action="rating" data-id="' + p.id + '">Rating Detail</button>';
    box.appendChild(art);
  }
  addRatingBadges();   // Câu 5: chèn <span> sao trung bình lên góc ảnh
}

/* ---------- Câu 2: lọc sản phẩm ---------- */
function applyFilter() {
  var f = document.getElementById("searchForm");
  var min = parseFloat(f.priceMin.value) || 0;
  var max = parseFloat(f.priceMax.value);
  if (isNaN(max)) max = Infinity;
  var minRate = parseFloat(f.minRating.value) || 0;
  var cat = f.category.value, checked = [];
  var cbs = f.querySelectorAll('input[name="color"]:checked');
  for (var i = 0; i < cbs.length; i++) checked.push(cbs[i].value);
  var result = [];
  for (var j = 0; j < products.length; j++) {
    var p = products[j], ok = true;
    var avg = avgRatings[p.id] || 0;
    if (p.price < min || p.price > max) ok = false;
    if (avg < minRate) ok = false;
    if (cat !== "" && p.category !== cat) ok = false;
    if (checked.length > 0) {
      var has = false;
      for (var k = 0; k < checked.length; k++) { if (p.colors.indexOf(checked[k]) >= 0) has = true; }
      if (!has) ok = false;
    }
    if (ok) result.push(p);
  }
  renderProducts(result);
}

/* ---------- Câu 6: CartState ---------- */
var CartState = {
  items: [],
  load: function () {
    try { this.items = JSON.parse(localStorage.getItem("cartItems")) || []; } catch (e) { this.items = []; }
  },
  save: function () { localStorage.setItem("cartItems", JSON.stringify(this.items)); },
  addItem: function (id, variant, qty) {
    var p = findProduct(id);
    if (!p) return;
    qty = qty || 1;
    var found = false;
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i].id == id && this.items[i].variant == variant) { this.items[i].qty += qty; found = true; break; }
    }
    if (!found) this.items.push({ id: id, title: p.title, price: p.price, variant: variant, qty: qty });
    this.save(); this.renderMiniCart();
  },
  changeQty: function (index, delta) {
    this.items[index].qty += delta;
    if (this.items[index].qty <= 0) this.items.splice(index, 1);
    this.save(); this.renderMiniCart();
  },
  removeItem: function (index) { this.items.splice(index, 1); this.save(); this.renderMiniCart(); },
  clear: function () { this.items = []; this.save(); this.renderMiniCart(); },
  updateTotal: function () {
    var t = 0;
    for (var i = 0; i < this.items.length; i++) t += this.items[i].price * this.items[i].qty;
    return t;
  },
  countItems: function () {
    var c = 0;
    for (var i = 0; i < this.items.length; i++) c += this.items[i].qty;
    return c;
  },
  renderMiniCart: function () {
    document.getElementById("cartCount").textContent = this.countItems();
    var box = document.getElementById("miniCart");
    if (this.items.length == 0) {
      box.innerHTML = '<h3>Giỏ hàng</h3><p class="cart-empty">Giỏ hàng trống.</p>';
      return;
    }
    var html = '<h3>Giỏ hàng</h3><table><tr><th>Sản phẩm</th><th>SL</th><th>Tiền</th><th></th></tr>';
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i], v = it.variant.split("|");
      html += '<tr><td>' + it.title.substring(0, 28) + '<br><small>' + v[0] + ' / ' + v[1] + ' - ' + money(it.price) + '</small></td>' +
        '<td><button class="qty-btn" data-act="dec" data-index="' + i + '">-</button> ' + it.qty +
        ' <button class="qty-btn" data-act="inc" data-index="' + i + '">+</button></td>' +
        '<td>' + money(it.price * it.qty) + '</td>' +
        '<td><button class="del-btn" data-act="del" data-index="' + i + '">🗑</button></td></tr>';
    }
    html += '</table><div class="cart-total">Tổng tiền: ' + money(this.updateTotal()) + '</div>' +
      '<button class="btn-primary" id="btnCheckout" data-act="checkout">Thanh toán</button>';
    box.innerHTML = html;
  }
};

/* ---------- Câu 7: Thanh toán + validation ---------- */
var RULES = {
  coName:    { test: function (v) { return v.trim().length >= 2; }, err: "Họ tên tối thiểu 2 ký tự", ok: "Họ tên hợp lệ" },
  coPhone:   { test: function (v) { return /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(v.trim()); }, err: "SĐT không hợp lệ (VD: 0912345678 hoặc +84912345678)", ok: "SĐT hợp lệ" },
  coEmail:   { test: function (v) { return /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(v.trim()); }, err: "Email không đúng định dạng", ok: "Email hợp lệ" },
  coAddress: { test: function (v) { return v.trim().length >= 5; }, err: "Địa chỉ tối thiểu 5 ký tự", ok: "Địa chỉ hợp lệ" }
};
var FIELD_IDS = ["coName", "coPhone", "coEmail", "coAddress"];

function validateField(input) {
  var r = RULES[input.id], msg = document.getElementById(input.id + "Msg");
  var good = r.test(input.value);
  msg.textContent = good ? r.ok : r.err;
  msg.className = "msg " + (good ? "ok" : "error");
  input.className = good ? "valid" : "invalid";
  return good;
}
function openCheckout() {
  if (CartState.items.length == 0) { alert("Giỏ hàng trống!"); return; }
  var opts = '<option value="">-- Tự điền thông tin --</option>';
  for (var i = 0; i < customers.length; i++) opts += '<option value="' + customers[i].id + '">' + customers[i].id + ' - ' + customers[i].name + '</option>';
  document.getElementById("checkoutBody").innerHTML =
    '<h2>Thông tin giao hàng</h2><p>Tổng thanh toán: <b>' + money(CartState.updateTotal()) + '</b></p><br>' +
    '<form id="checkoutForm" novalidate>' +
    '<div class="field"><label for="coCustomer">Khách hàng</label><select id="coCustomer">' + opts + '</select></div>' +
    '<div class="field"><label for="coName">Họ tên</label><input type="text" id="coName" placeholder="Nguyễn Văn A"><span class="msg" id="coNameMsg"></span></div>' +
    '<div class="field"><label for="coPhone">Số điện thoại</label><input type="text" id="coPhone" placeholder="0912345678"><span class="msg" id="coPhoneMsg"></span></div>' +
    '<div class="field"><label for="coEmail">Email</label><input type="text" id="coEmail" placeholder="abc@gmail.com"><span class="msg" id="coEmailMsg"></span></div>' +
    '<div class="field"><label for="coAddress">Địa chỉ</label><input type="text" id="coAddress" placeholder="Số nhà, đường, quận"><span class="msg" id="coAddressMsg"></span></div>' +
    '<button type="submit" class="btn-primary">Xác nhận đặt hàng</button></form>';
  for (var k = 0; k < FIELD_IDS.length; k++) {
    var el = document.getElementById(FIELD_IDS[k]);
    el.addEventListener("keyup", function () { validateField(this); });
    el.addEventListener("blur", function () { validateField(this); });
  }
  document.getElementById("coCustomer").onchange = function () {
    var vals = ["", "", "", ""];
    for (var i = 0; i < customers.length; i++) {
      if (customers[i].id == this.value) vals = [customers[i].name, customers[i].phone, customers[i].email, customers[i].address];
    }
    for (var j = 0; j < FIELD_IDS.length; j++) {
      var f = document.getElementById(FIELD_IDS[j]);
      f.value = vals[j];
      if (vals[j] !== "") validateField(f);
    }
  };
  document.getElementById("checkoutForm").onsubmit = function (e) {
    e.preventDefault();
    var all = true;
    for (var i = 0; i < FIELD_IDS.length; i++) { if (!validateField(document.getElementById(FIELD_IDS[i]))) all = false; }
    if (all) placeOrder();
  };
  document.getElementById("miniCart").hidden = true;
  showModal("checkoutModal");
}
function placeOrder() {
  var items = [];
  for (var i = 0; i < CartState.items.length; i++) {
    var it = CartState.items[i], v = it.variant.split("|");
    items.push({ product_id: it.id, product_name: it.title, color: v[0], size: v[1], quantity: it.qty, price: it.price });
  }
  var d = new Date();
  var date = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  var cid = document.getElementById("coCustomer").value;
  var order = {
    cart_id: "HD" + d.getTime(), date: date, employee_id: "WEB",
    customer_id: cid || "KHACH", customer_name: document.getElementById("coName").value.trim(),
    phone: document.getElementById("coPhone").value.trim(), email: document.getElementById("coEmail").value.trim(),
    address: document.getElementById("coAddress").value.trim(),
    items: items, total: CartState.updateTotal()
  };
  var orders = [];
  try { orders = JSON.parse(localStorage.getItem("orders")) || []; } catch (e) { orders = []; }
  orders.push(order);
  localStorage.setItem("orders", JSON.stringify(orders));
  CartState.clear();
  document.getElementById("checkoutBody").innerHTML =
    '<h2>✅ Đặt hàng thành công!</h2><p>Mã hóa đơn: <b>' + order.cart_id + '</b></p><p>Tổng tiền: <b>' + money(order.total) + '</b></p><br>' +
    '<button class="btn-primary" data-close="1">Đóng</button>';
}

/* ---------- Xem nhanh & Rating Detail ---------- */
function openQuick(id, variant) {
  var p = findProduct(id), v = variant.split("|"), avg = avgRatings[id];
  document.getElementById("quickBody").innerHTML =
    '<div class="qv"><img src="' + p.image + '" alt="" onerror="imgErr(this)"><div class="qv-info">' +
    '<h2>' + p.title + '</h2><div class="price">' + money(p.price) + '</div>' +
    '<p>' + p.description + '</p><p>Danh mục: ' + p.category + '</p>' +
    '<p>Phân loại: <b>' + v[0] + ' / ' + v[1] + '</b></p><p>Tồn kho: ' + p.stock + '</p>' +
    '<p>Đánh giá TB: ⭐ ' + (avg ? avg.toFixed(1) : "--") + '</p>' +
    '<button class="btn-add" id="qvAdd" style="padding:9px;border:0;border-radius:5px">Thêm vào giỏ hàng</button></div></div>';
  document.getElementById("qvAdd").onclick = function () {
    CartState.addItem(id, variant, 1);
    hideModal("quickModal"); showToast("Đã thêm vào giỏ hàng");
  };
  showModal("quickModal");
}
function openRating(id) {
  var p = findProduct(id), avg = avgRatings[id];
  var html = '<h2>Đánh giá: ' + p.title + '</h2><p>Điểm TB: ⭐ ' + (avg ? avg.toFixed(1) : "--") + '</p>' +
    '<table class="data-table"><tr><th>Khách hàng</th><th>Sao</th><th>Nhận xét</th><th>Ngày</th></tr>';
  var n = 0;
  for (var i = 0; i < reviews.length; i++) {
    if (reviews[i].product_id == id) {
      n++;
      html += '<tr><td>' + reviews[i].customer_name + '</td><td>' + reviews[i].rating + ' ⭐</td><td>' + reviews[i].comment + '</td><td>' + reviews[i].date + '</td></tr>';
    }
  }
  if (n == 0) html += '<tr><td colspan="4">Chưa có đánh giá.</td></tr>';
  document.getElementById("ratingBody").innerHTML = html + '</table>';
  showModal("ratingModal");
}

/* ---------- Khởi tạo ---------- */
window.onload = function () {
  CartState.load();
  CartState.renderMiniCart();
  showSkeleton();
  setTimeout(function () { ready.skeleton = true; tryRender(); }, 1200);   // Skeleton ~1.2s

  loadXML("xml/products.xml", function (xml) { parseProducts(xml); ready.products = true; tryRender(); });
  loadXML("xml/reviews.xml", function (xml) { parseReviews(xml); ready.reviews = true; tryRender(); });
  loadJSON("json/customers.json", function (data) { customers = data; });

  // Câu 4: DUY NHẤT 1 addEventListener('click') trên container danh sách sản phẩm (Event Delegation)
  document.getElementById("productList").addEventListener("click", function (event) {
    var t = event.target;
    var action = t.getAttribute("data-action");
    if (!action) return;
    var id = t.getAttribute("data-id");
    var card = t.closest("article");
    var variant = card.querySelector(".sel-color").value + "|" + card.querySelector(".sel-size").value;
    var btns = card.querySelectorAll("[data-variant]");
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute("data-variant", variant);
    variant = t.getAttribute("data-variant") || variant;
    if (action == "add") { CartState.addItem(id, variant, 1); showToast("Đã thêm vào giỏ hàng"); }
    else if (action == "quick") { openQuick(id, variant); }
    else if (action == "rating") { openRating(id); }
  });

  // Các sự kiện khác dùng thuộc tính onclick/onsubmit (không dùng thêm addEventListener('click'))
  document.getElementById("searchForm").onsubmit = function (e) { e.preventDefault(); applyFilter(); };
  document.getElementById("searchForm").onreset = function () { setTimeout(applyFilter, 0); };
  document.getElementById("btnSync").onclick = syncApiToXml;
  document.getElementById("btnCart").onclick = function () {
    var mc = document.getElementById("miniCart");
    mc.hidden = !mc.hidden;
    mc.style.top = (window.pageYOffset + 70) + "px";
  };
  document.getElementById("miniCart").onclick = function (e) {
    var act = e.target.getAttribute("data-act");
    if (!act) return;
    var idx = parseInt(e.target.getAttribute("data-index"));
    if (act == "inc") CartState.changeQty(idx, 1);
    else if (act == "dec") CartState.changeQty(idx, -1);
    else if (act == "del") CartState.removeItem(idx);
    else if (act == "checkout") openCheckout();
  };
  var modals = document.querySelectorAll(".modal");
  for (var m = 0; m < modals.length; m++) {
    modals[m].onclick = function (e) {
      if (e.target === this || e.target.hasAttribute("data-close")) this.hidden = true;
    };
  }
};
