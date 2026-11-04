var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/finance.js
var DEFAULT_EXPENSE_CATEGORIES = [
  "Alimenta\xE7\xE3o",
  "Combust\xEDvel",
  "Casa",
  "Transporte",
  "Sa\xFAde",
  "Educa\xE7\xE3o",
  "Lazer",
  "Compras",
  "Assinaturas",
  "Outros"
];
var normalizeLabel = /* @__PURE__ */ __name((value) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " "), "normalizeLabel");
function getExpenseCategories(data) {
  return [
    .../* @__PURE__ */ new Set([
      ...data.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES,
      ...data.records.filter((r) => r.type === "expense").map((r) => r.category),
      ...(data.budgets || []).map((b) => b.category)
    ])
  ];
}
__name(getExpenseCategories, "getExpenseCategories");
var VERSION = 1;
var currentMonth = /* @__PURE__ */ __name(() => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit"
}).format(/* @__PURE__ */ new Date()), "currentMonth");
function addMonths(month, offset) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + offset, 2));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
__name(addMonths, "addMonths");
function distance(a, b) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + bm - am;
}
__name(distance, "distance");
var emptyData = /* @__PURE__ */ __name(() => ({
  version: VERSION,
  records: [],
  overrides: {},
  jars: [],
  budgets: [],
  budgetMigrationDone: true,
  accountOpeningBalances: {},
  monthCycle: { activeMonth: currentMonth(), closedMonths: [] },
  banks: [],
  expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES]
}), "emptyData");
function occurrence(record, month, overrides = {}) {
  const index = distance(record.startMonth, month);
  if (index < 0 || record.endMonth && month > record.endMonth || record.kind === "once" && index !== 0 || record.kind === "installment" && index >= record.installments)
    return null;
  const key = `${record.id}:${month}`;
  const override = overrides[key] || {};
  const [year, monthNumber] = month.split("-").map(Number);
  const day = Math.min(
    record.day,
    new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  );
  return {
    ...record,
    bankId: override.bankId ?? record.bankId ?? "",
    day,
    key,
    month,
    amount: override.amount ?? record.amount,
    done: override.done ?? (record.kind === "installment" && index < record.paidInstallments),
    installment: record.kind === "installment" ? index + 1 : null,
    plannedAmount: record.amount,
    actualAmount: override.amount ?? (override.done ?? (record.kind === "installment" && index < record.paidInstallments) ? record.amount : null),
    estimated: record.variable && override.amount === void 0
  };
}
__name(occurrence, "occurrence");
function jarBalance(jar, month, data) {
  const span = distance(jar.startMonth, month);
  if (span < 0) return 0;
  let balance = jar.initialBalance;
  for (let i = 0; i <= span; i++) {
    const at = addMonths(jar.startMonth, i);
    const movements = jar.movements.filter((m) => m.month === at).reduce((s, m) => s + m.amount, 0);
    const linked = (data?.records || []).filter((r) => r.type === "jarContribution" && r.jarId === jar.id).map((r) => occurrence(r, at, data.overrides)).filter((r) => r?.done).reduce((sum, r) => sum + r.amount, 0);
    balance = Math.round(
      (balance + jar.monthlyDeposit + movements + linked) * (1 + jar.rate / 100)
    );
  }
  return balance;
}
__name(jarBalance, "jarBalance");
function validateData(data) {
  const fail = /* @__PURE__ */ __name(() => {
    throw new Error(
      "Arquivo inv\xE1lido. Importe um backup JSON exportado pelo Casa em dia."
    );
  }, "fail");
  const validMonth = /* @__PURE__ */ __name((m) => typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && Number(m.slice(0, 4)) >= 1900 && Number(m.slice(0, 4)) <= 2200, "validMonth");
  const cents = /* @__PURE__ */ __name((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e12, "cents");
  const validId = /* @__PURE__ */ __name((v) => typeof v === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(v), "validId");
  if (!data || data.version !== VERSION || !Array.isArray(data.records) || !Array.isArray(data.jars) || !data.overrides || Array.isArray(data.overrides) || typeof data.overrides !== "object" || data.records.length > 1e4 || data.jars.length > 500)
    fail();
  if (data.monthCycle !== void 0) {
    const cycle = data.monthCycle;
    if (!cycle || !validMonth(cycle.activeMonth) || !Array.isArray(cycle.closedMonths) || cycle.closedMonths.length > 4e3 || new Set(cycle.closedMonths).size !== cycle.closedMonths.length || cycle.closedMonths.some((m) => !validMonth(m) || m === cycle.activeMonth))
      fail();
  }
  if (data.accountOpeningBalances !== void 0) {
    if (!data.accountOpeningBalances || typeof data.accountOpeningBalances !== "object" || Array.isArray(data.accountOpeningBalances))
      fail();
    for (const [m, amount] of Object.entries(data.accountOpeningBalances))
      if (!validMonth(m) || !Number.isSafeInteger(amount) || Math.abs(amount) > 1e12)
        fail();
  }
  if (data.budgetMigrationDone !== void 0 && typeof data.budgetMigrationDone !== "boolean")
    fail();
  const banks = data.banks ?? [];
  if (!Array.isArray(banks) || banks.length > 500) fail();
  const bankIds = /* @__PURE__ */ new Set(), bankNames = /* @__PURE__ */ new Set();
  for (const b of banks) {
    if (!b || !validId(b.id) || bankIds.has(b.id) || typeof b.name !== "string" || !b.name.trim() || b.name.length > 150 || bankNames.has(normalizeLabel(b.name)))
      fail();
    bankIds.add(b.id);
    bankNames.add(normalizeLabel(b.name));
  }
  if (data.expenseCategories !== void 0) {
    if (!Array.isArray(data.expenseCategories) || data.expenseCategories.length > 500)
      fail();
    const names = /* @__PURE__ */ new Set();
    for (const name of data.expenseCategories) {
      if (typeof name !== "string" || !name.trim() || name.length > 150 || names.has(name))
        fail();
      names.add(name);
    }
  }
  const validBank = /* @__PURE__ */ __name((value) => value === void 0 || value === "" || typeof value === "string" && bankIds.has(value), "validBank");
  const ids = new Set(bankIds);
  for (const r of data.records) {
    if (!r || !validId(r.id) || !validBank(r.bankId) || ids.has(r.id) || typeof r.name !== "string" || !r.name.trim() || r.name.length > 150 || !["income", "expense", "jarContribution"].includes(r.type) || !["once", "recurring", "installment"].includes(r.kind) || !cents(r.amount) || !validMonth(r.startMonth) || r.endMonth && (!validMonth(r.endMonth) || r.endMonth < r.startMonth) || !Number.isInteger(r.day) || r.day < 1 || r.day > 31 || typeof r.category !== "string" || typeof r.person !== "string" || typeof r.variable !== "boolean" || typeof r.benefit !== "boolean" || !["cash", "benefit"].includes(r.paymentSource))
      fail();
    if (r.kind === "installment" && (!Number.isInteger(r.installments) || r.installments < 1 || r.installments > 600 || !Number.isInteger(r.paidInstallments) || r.paidInstallments < 0 || r.paidInstallments > r.installments))
      fail();
    if (r.type === "jarContribution") {
      const jar = data.jars.find((j) => j?.id === r.jarId);
      if (!jar || r.startMonth < jar.startMonth || r.paymentSource !== "cash" || r.benefit || r.variable || r.category !== "Caixinhas")
        fail();
    }
    ids.add(r.id);
  }
  for (const [key, value] of Object.entries(data.overrides)) {
    const [recordId, month] = key.split(":");
    if (!ids.has(recordId) || !validMonth(month) || key !== `${recordId}:${month}` || !value || typeof value !== "object" || value.amount !== void 0 && !cents(value.amount) || !validBank(value.bankId) || value.done !== void 0 && typeof value.done !== "boolean")
      fail();
  }
  if (data.budgets !== void 0 && (!Array.isArray(data.budgets) || data.budgets.length > 500))
    fail();
  const categories = /* @__PURE__ */ new Set();
  for (const b of data.budgets || []) {
    if (!b || !validId(b.id) || ids.has(b.id) || typeof b.category !== "string" || !b.category.trim() || b.category.length > 100 || categories.has(b.category) || !cents(b.amount) || !validMonth(b.startMonth) || b.endMonth && (!validMonth(b.endMonth) || b.endMonth < b.startMonth) || !["cash", "benefit"].includes(b.paymentSource) || !b.limits || typeof b.limits !== "object" || Array.isArray(b.limits))
      fail();
    if (b.excludedMonths !== void 0 && (!Array.isArray(b.excludedMonths) || b.excludedMonths.length > 4e3 || b.excludedMonths.some((m) => !validMonth(m) || m < b.startMonth) || new Set(b.excludedMonths).size !== b.excludedMonths.length))
      fail();
    for (const [m, value] of Object.entries(b.limits))
      if (!validMonth(m) || m < b.startMonth || !cents(value)) fail();
    ids.add(b.id);
    categories.add(b.category);
  }
  for (const j of data.jars) {
    if (!j || !validId(j.id) || ids.has(j.id) || typeof j.name !== "string" || !j.name.trim() || j.name.length > 150 || typeof j.bank !== "string" || !cents(j.initialBalance) || !cents(j.monthlyDeposit) || !cents(j.goal) || !validMonth(j.startMonth) || !Number.isFinite(j.rate) || j.rate < 0 || j.rate > 10 || !Array.isArray(j.movements) || j.movements.length > 1e4)
      fail();
    for (const m of j.movements)
      if (!m || !validId(m.id) || !validMonth(m.month) || m.month < j.startMonth || !Number.isSafeInteger(m.amount) || Math.abs(m.amount) > 1e12)
        fail();
    if (j.movements.some((m) => m.amount < 0 && jarBalance(j, m.month, data) < 0))
      throw new Error(
        "Esta altera\xE7\xE3o deixaria uma caixinha negativa. Confira os aportes e as retiradas vinculadas."
      );
    ids.add(j.id);
  }
  return data;
}
__name(validateData, "validateData");
function upgradeBudgets(input) {
  validateData(input);
  const data = {
    ...input,
    budgetMigrationDone: true,
    budgets: [...input.budgets || []],
    banks: [...input.banks || []],
    expenseCategories: getExpenseCategories(input),
    records: [],
    overrides: { ...input.overrides }
  };
  for (const r of input.records) {
    const category = r.name === "Combust\xEDvel" ? "Combust\xEDvel" : "Alimenta\xE7\xE3o";
    if (input.budgetMigrationDone === true && input.budgets !== void 0 || r.type !== "expense" || r.kind !== "recurring" || !["Alimenta\xE7\xE3o", "Combust\xEDvel"].includes(r.name) || data.budgets.some((b) => b.category === category)) {
      data.records.push(r);
      continue;
    }
    data.budgets.push({
      id: r.id,
      category,
      amount: r.amount,
      startMonth: r.startMonth,
      endMonth: r.endMonth || "",
      paymentSource: r.paymentSource,
      limits: {}
    });
    for (const [key, o] of Object.entries(input.overrides)) {
      if (!key.startsWith(r.id + ":")) continue;
      delete data.overrides[key];
      const month = key.split(":")[1];
      const actual = o.amount ?? (o.done ? r.amount : null);
      if (actual === null) continue;
      const recordId = `spent-${r.id}-${month}`;
      data.records.push({
        ...r,
        id: recordId,
        name: `${r.name} \xB7 gasto inicial`,
        category,
        kind: "once",
        startMonth: month,
        endMonth: "",
        amount: actual,
        variable: false
      });
      data.overrides[`${recordId}:${month}`] = {
        amount: actual,
        done: o.done ?? false
      };
    }
  }
  return validateData(data);
}
__name(upgradeBudgets, "upgradeBudgets");

// worker/index.js
var encoder = new TextEncoder();
var toHex = /* @__PURE__ */ __name((bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join(""), "toHex");
var randomHex = /* @__PURE__ */ __name((size) => toHex(crypto.getRandomValues(new Uint8Array(size))), "randomHex");
var digest = /* @__PURE__ */ __name(async (value) => toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value))), "digest");
var derive = /* @__PURE__ */ __name(async (password, salt) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return toHex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: encoder.encode(salt),
        iterations: 1e5
      },
      key,
      256
    )
  );
}, "derive");
function equal(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(equal, "equal");
var SESSION_AGE = 7 * 24 * 60 * 60 * 1e3;
function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
      ...extra
    }
  });
}
__name(json, "json");
var sessionToken = /* @__PURE__ */ __name((req) => /(?:^|;\s*)casa_session=([a-f0-9]{64})(?:;|$)/.exec(
  req.headers.get("Cookie") || ""
)?.[1], "sessionToken");
var cookie = /* @__PURE__ */ __name((req, token, age) => `casa_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`, "cookie");
async function readBody(req) {
  const limit = 1024 * 1024;
  if (Number(req.headers.get("Content-Length") || 0) > limit)
    throw Object.assign(new Error("Arquivo muito grande. Limite: 1 MB."), {
      status: 413
    });
  const reader = req.body?.getReader();
  if (!reader)
    throw Object.assign(new Error("Corpo da requisi\xE7\xE3o ausente."), {
      status: 400
    });
  let bytes = 0;
  const parts = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > limit) {
      await reader.cancel();
      throw Object.assign(new Error("Arquivo muito grande. Limite: 1 MB."), {
        status: 413
      });
    }
    parts.push(value);
  }
  const all = new Uint8Array(bytes);
  let offset = 0;
  for (const part of parts) {
    all.set(part, offset);
    offset += part.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(all));
  } catch {
    throw Object.assign(new Error("JSON inv\xE1lido."), { status: 400 });
  }
}
__name(readBody, "readBody");
async function api(req, env, ctx) {
  const url = new URL(req.url);
  const db = env.DB;
  if (!["GET", "HEAD"].includes(req.method) && req.headers.get("Origin") !== url.origin)
    return json(403, { error: "Origem da solicita\xE7\xE3o n\xE3o permitida." });
  if (url.pathname === "/api/health" && req.method === "GET") {
    await db.prepare("SELECT 1").first();
    return json(200, { ok: true });
  }
  if (["/api/login", "/api/signup"].includes(url.pathname) && req.method === "POST") {
    const now = Date.now();
    const ip = await digest(req.headers.get("CF-Connecting-IP") || "local");
    const window = Math.floor(now / (15 * 60 * 1e3));
    const rate = await db.prepare(
      "INSERT INTO auth_attempts(ip,window,count) VALUES(?,?,1) ON CONFLICT(ip) DO UPDATE SET window=excluded.window,count=CASE WHEN auth_attempts.window=excluded.window THEN auth_attempts.count+1 ELSE 1 END RETURNING count"
    ).bind(ip, window).first();
    if (rate.count > 20)
      return json(429, { error: "Muitas tentativas. Aguarde 15 minutos." });
    const input = await readBody(req);
    const username = typeof input?.username === "string" ? input.username.trim().toLowerCase() : "";
    const password = input?.password;
    if (!/^[a-z0-9_-]{3,40}$/.test(username) || typeof password !== "string" || password.length < 10 || password.length > 128)
      return json(400, {
        error: "Use um identificador de 3 a 40 letras sem acentos, n\xFAmeros ou h\xEDfens e uma senha de 10 a 128 caracteres."
      });
    let household2 = await db.prepare(
      "SELECT id,username,salt,password FROM households WHERE username=?"
    ).bind(username).first();
    if (url.pathname === "/api/signup") {
      if (env.ALLOW_SIGNUP === "false")
        return json(403, {
          error: "Novos cadastros est\xE3o desativados neste servidor."
        });
      if (household2)
        return json(409, {
          error: "Esse identificador j\xE1 est\xE1 em uso. Fa\xE7a login ou escolha outro."
        });
      const salt = randomHex(16);
      const hash = await derive(password, salt);
      try {
        household2 = await db.prepare(
          "INSERT INTO households(username,salt,password,data) VALUES(?,?,?,?) RETURNING id,username"
        ).bind(username, salt, hash, JSON.stringify(emptyData())).first();
      } catch (error) {
        if (/UNIQUE/.test(error.message))
          return json(409, { error: "Esse identificador j\xE1 est\xE1 em uso." });
        throw error;
      }
    } else {
      const hash = await derive(password, household2?.salt || "0".repeat(32));
      if (!household2 || !equal(hash, household2.password))
        return json(401, { error: "Identificador ou senha incorretos." });
    }
    const token2 = randomHex(32);
    await db.prepare("INSERT INTO sessions(token,household_id,expires) VALUES(?,?,?)").bind(await digest(token2), household2.id, now + SESSION_AGE).run();
    ctx.waitUntil(
      db.batch([
        db.prepare("DELETE FROM sessions WHERE expires<=?").bind(now),
        db.prepare("DELETE FROM auth_attempts WHERE window<?").bind(window - 1)
      ])
    );
    return json(
      200,
      { username: household2.username },
      { "Set-Cookie": cookie(req, token2, SESSION_AGE / 1e3) }
    );
  }
  if (url.pathname === "/api/logout" && req.method === "POST") {
    const token2 = sessionToken(req);
    if (token2)
      await db.prepare("DELETE FROM sessions WHERE token=?").bind(await digest(token2)).run();
    return json(200, { ok: true }, { "Set-Cookie": cookie(req, "", 0) });
  }
  const token = sessionToken(req);
  const household = token ? await db.prepare(
    "SELECT households.id,username,data,revision FROM sessions JOIN households ON household_id=households.id WHERE token=? AND expires>?"
  ).bind(await digest(token), Date.now()).first() : null;
  if (!household)
    return json(401, { error: "Fa\xE7a login para acessar os dados da fam\xEDlia." });
  if (url.pathname === "/api/data" && req.method === "GET")
    return json(200, {
      username: household.username,
      data: upgradeBudgets(JSON.parse(household.data)),
      revision: household.revision
    });
  if (url.pathname === "/api/data" && req.method === "PUT") {
    const input = await readBody(req);
    try {
      validateData(input?.data);
    } catch {
      return json(400, { error: "Os dados enviados s\xE3o inv\xE1lidos." });
    }
    if (!Number.isSafeInteger(input.revision) || input.revision < 0)
      return json(400, { error: "Vers\xE3o dos dados inv\xE1lida." });
    const data = {
      version: 1,
      records: input.data.records,
      overrides: input.data.overrides,
      jars: input.data.jars,
      budgets: input.data.budgets || [],
      budgetMigrationDone: input.data.budgetMigrationDone ?? true,
      accountOpeningBalances: input.data.accountOpeningBalances || {},
      ...input.data.monthCycle ? { monthCycle: input.data.monthCycle } : {},
      banks: input.data.banks || [],
      expenseCategories: input.data.expenseCategories ?? upgradeBudgets(input.data).expenseCategories
    };
    const result = await db.prepare(
      "UPDATE households SET data=?,revision=revision+1 WHERE id=? AND revision=?"
    ).bind(JSON.stringify(data), household.id, input.revision).run();
    if (result.meta.changes === 0)
      return json(409, {
        error: "Outra pessoa atualizou os dados. Atualize e refa\xE7a a altera\xE7\xE3o para preservar os dois registros."
      });
    return json(200, { revision: input.revision + 1 });
  }
  return json(404, { error: "Opera\xE7\xE3o n\xE3o encontrada." });
}
__name(api, "api");
var index_default = {
  async fetch(req, env, ctx) {
    try {
      if (new URL(req.url).pathname.startsWith("/api/"))
        return await api(req, env, ctx);
      const response = await env.ASSETS.fetch(req);
      const secure = new Response(response.body, response);
      secure.headers.set("X-Content-Type-Options", "nosniff");
      secure.headers.set("Referrer-Policy", "same-origin");
      secure.headers.set("X-Frame-Options", "DENY");
      secure.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      );
      return secure;
    } catch (error) {
      return json(error.status || 500, {
        error: error.status ? error.message : "N\xE3o foi poss\xEDvel concluir a opera\xE7\xE3o."
      });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
