export const STOVE_SCRIPT = `(async function analyzeLostArkFinal() {
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
    const getStoveCookie = (n) => {
        const v = \`; \${document.cookie}\`;
        const p = v.split(\`; \${n}=\`);
        return p.length === 2 ? p.pop().split(";").shift() : null;
    };
    const CONFIG = {
        YEARS: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        CATEGORIES: {
            '강화/재료': ['T3', 'T4', '파편', '돌파', '실링', '융화', '강화', '수호', '파괴', '태양', '성장', '보석', '모험의 길', '올인원'],
            '패스/성장': ['패스', '베른', '로헨델', '욘', '페이튼', '파푸니카', '엘가시아', '쿠르잔', '슬롯', '확장'],
            '아바타/외형': ['아바타', '무기', '펫', '탈 것', '옷감', '염색', '머리', '상의', '하의', '벽지', '예복', '의상', '얼굴'],
            '유료서비스': ['베아트리스', '니나브', '축복', '아크 패스', '프리미엄'],
            '카드/확률형': ['카드', '복주머니', '팩', '랜덤', '럭키', '박스', '상자'],
            '화폐거래소': ['화폐거래소'],
            '기타/패키지': ['낙원', '크리스탈', '배틀', '회복', '기능성']
        }
    };
    let playTimeHTML = "";
    let chargeStats = {};
    const yearlyData = {};
    let grandTotal = 0;
    async function fetchPlayTime() {
        try {
            const t = getStoveCookie("SUAT");
            const r = await fetch("https://api.onstove.com/game/v2.0/member/logs", { headers: { Authorization: \`Bearer \${t}\` } });
            const d = await r.json();
            const l = d.value.find(g => g.game_name === "LOST ARK");
            if (l) {
                const pt = l.play_time, h = Math.floor(pt / 60), td = Math.floor(h / 24), ty = Math.floor(td / 365), rm = Math.floor((td % 365) / 30);
                playTimeHTML = \`<div style="line-height:1.8;"><span style="color:#0984e3; font-weight:bold;">🕹️ 총 플레이시간:</span> <b>\${h.toLocaleString()}시간</b><br><span style="color:#0984e3; font-weight:bold;">⏳ 시간 환산:</span> <b>\${ty}년 \${rm}개월</b> (약 \${td.toLocaleString()}일)</div>\`;
            }
        } catch (e) { playTimeHTML = "정보 로드 실패"; }
    }
    function structureItemName(n) {
        if (!n.includes(' - ')) return \`<span style="font-size:14px; font-weight:500;">\${escapeHtml(n)}</span>\`;
        const p = n.split(' - '), t = p[0].trim(), c = p.slice(1).join(' - ').trim();
        const it = c.split(/ - | -/).map(i => i.replace(/^[- ]+/, '').trim()).filter(i => i.length > 1 && i !== t);
        const u = [...new Set(it)];
        return \`<strong style="color:#2d3436; display:block; margin-bottom:4px; font-size:14px;">\${escapeHtml(t)}</strong><span style="color:#636e72; font-size:12px; line-height:1.5;">• \${u.map(escapeHtml).join('<br>• ')}</span>\`;
    }
    async function fetchData() {
        for (const y of CONFIG.YEARS) {
            const r = { StartDate: \`\${y}.01.01\`, EndDate: \`\${y}.12.31\` };
            yearlyData[y] = { total: 0, categories: {} };
            try {
                const cf = await $.ajax({ url: '/Cash/GetChargeList', data: { Page: 1, ...r } });
                const cl = parseInt($(cf).find('.pagination__last').attr('onClick')?.match(/\\d+/)?.[0] || 1);
                for (let i = 1; i <= cl; i++) {
                    const d = (i === 1) ? cf : await $.ajax({ url: '/Cash/GetChargeList', data: { Page: i, ...r } });
                    $(d).find('tbody tr').each((_, el) => {
                        const rw = $(el).find('td:nth-child(2)').text().trim(), pr = parseInt($(el).find('td:nth-child(3)').text().replace(/[^0-9]/g, '')) || 0;
                        if (rw && rw !== '-' && rw !== '충전수단') {
                            const cw = rw.split(/[0-9]|포인트/)[0].trim();
                            chargeStats[cw] = (chargeStats[cw] || 0) + pr;
                        }
                    });
                }
                const pf = await $.ajax({ url: '/Cash/GetPurchaseList', data: { Page: 1, ...r } });
                const pl = parseInt($(pf).find('.pagination__last').attr('onClick')?.match(/\\d+/)?.[0] || 1);
                for (let i = 1; i <= pl; i++) {
                    const d = (i === 1) ? pf : await $.ajax({ url: '/Cash/GetPurchaseList', data: { Page: i, ...r } });
                    $(d).find('tbody tr').each((_, el) => {
                        const rn = $(el).find('.list__buy-name').text().trim(), cs = parseInt($(el).find('.list__price').text().replace(/[^0-9]/g, '')) || 0;
                        if (rn) updateYearly(y, rn, cs);
                    });
                }
                const mf = await $.ajax({ url: '/Cash/GetMarketList', data: { Page: 1, ...r } });
                const ml = parseInt($(mf).find('.pagination__last').attr('onClick')?.match(/\\d+/)?.[0] || 1);
                for (let i = 1; i <= ml; i++) {
                    const d = (i === 1) ? mf : await $.ajax({ url: '/Cash/GetMarketList', data: { Page: i, ...r } });
                    $(d).find('tbody tr').each((_, el) => {
                        const cs = parseInt($(el).find('.list__exchange').text().replace(/[^0-9]/g, '')) || 0;
                        if (cs > 0) updateYearly(y, '화폐거래소', cs);
                    });
                }
            } catch (e) {}
        }
    }
    function updateYearly(y, rn, cs) {
        const yn = yearlyData[y]; yn.total += cs;
        let cat = '기타/패키지';
        for (const [k, v] of Object.entries(CONFIG.CATEGORIES)) { if (v.some(s => rn.includes(s))) { cat = k; break; } }
        if (!yn.categories[cat]) yn.categories[cat] = { total: 0, items: {} };
        yn.categories[cat].total += cs;
        const sn = structureItemName(rn);
        if (!yn.categories[cat].items[sn]) yn.categories[cat].items[sn] = { count: 0, price: 0 };
        yn.categories[cat].items[sn].count++; yn.categories[cat].items[sn].price += cs;
    }
    await fetchPlayTime();
    await fetchData();
    const ch = Object.entries(chargeStats).sort((a,b)=>b[1]-a[1]).map(([m, a]) => \`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;"><span>\${escapeHtml(m)}</span><b>\${a.toLocaleString()}원</b></div>\`).join('');
    const yh = Object.keys(yearlyData).sort((a,b)=>b-a).map(y => {
        const d = yearlyData[y]; if (d.total === 0) return "";
        grandTotal += d.total;
        const ct = Object.entries(d.categories).sort((a,b)=>b[1].total - a[1].total).map(([cn, cd]) => {
            const it = Object.entries(cd.items).sort((a,b)=>b[1].price - a[1].price).map(([n, i]) => \`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;"><div style="flex:1;padding-right:15px;">\${n}</div><div style="text-align:right;min-width:100px;"><b>\${i.price.toLocaleString()}원</b><br><small style="color:#6c5ce7;">\${i.count}회</small></div></div>\`).join('');
            return \`<div style="margin-top:10px;border:1px solid #e1e8ed;border-radius:10px;"><button data-toggle-next="true" style="width:100%;padding:12px 15px;background:#f8f9fa;border:none;cursor:pointer;display:flex;justify-content:space-between;font-weight:bold;color:#0984e3;"><span>📦 \${escapeHtml(cn)}</span><span>\${cd.total.toLocaleString()}원 ▾</span></button><div style="display:none;padding:5px 15px 10px;background:#fff;">\${it}</div></div>\`;
        }).join('');
        return \`<div style="margin-bottom:15px;border:1px solid #ccc;border-radius:12px;overflow:hidden;"><button data-toggle-next="true" style="width:100%;padding:15px 25px;background:#2d3436;color:#fff;border:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:18px;font-weight:bold;">📅 \${escapeHtml(y)}년</span><span style="font-size:18px;color:#fdcb6e;font-weight:bold;">\${d.total.toLocaleString()}원 ▾</span></button><div style="display:none;padding:15px;background:#fff;">\${ct}</div></div>\`;
    }).join('');
    const l = \`<div id="loa-final" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#f1f2f6;z-index:999999;overflow-y:auto;padding:30px 15px;font-family:sans-serif;box-sizing:border-box;"><div style="max-width:700px;margin:0 auto;"><div style="background:#fff;padding:20px 25px;border-radius:15px;margin-bottom:15px;border:1px solid #d1d9e0;">\${playTimeHTML}</div><div style="background:#fff;border-radius:15px;margin-bottom:15px;border:1px solid #d1d9e0;overflow:hidden;"><button data-toggle-next="true" style="width:100%;padding:18px 25px;background:#fff;border:none;cursor:pointer;display:flex;justify-content:space-between;font-weight:bold;font-size:16px;"><span>💳 결제 수단별 합계</span><span>보기 ▾</span></button><div style="display:none;padding:15px 25px;border-top:1px solid #eee;">\${ch}</div></div><div style="background:#2d3436;color:#fff;padding:25px;border-radius:15px;text-align:center;margin-bottom:20px;"><div style="font-size:14px;opacity:0.8;margin-bottom:5px;">누적 총 결제액</div><div style="font-size:36px;font-weight:900;color:#00d2d3;">\${grandTotal.toLocaleString()}원</div></div>\${yh}<div style="text-align:center;margin:30px 0;"><button data-close-loa-final="true" style="padding:15px 50px;background:#333;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:bold;">닫기</button></div></div></div>\`;
    document.body.insertAdjacentHTML('beforeend', l);
    const root = document.getElementById('loa-final');
    if (!root) return;
    root.querySelectorAll('[data-toggle-next]').forEach((button) => {
        button.addEventListener('click', () => {
            const panel = button.nextElementSibling;
            if (panel instanceof HTMLElement) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
    });
    root.querySelector('[data-close-loa-final]')?.addEventListener('click', () => root.remove());
})();`;
