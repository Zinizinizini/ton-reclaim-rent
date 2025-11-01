<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Simple TON Wallet</title>
  <script src="https://unpkg.com/tonconnect/dist/tonconnect.min.js"></script>
  <script src="https://unpkg.com/ton/dist/ton.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; padding: 2rem; background: #f3f3f3; }
    button { padding: 10px 20px; font-size: 16px; cursor: pointer; background: #1e90ff; color: white; border: none; border-radius: 5px; }
    button:hover { background: #0d6efd; }
    .jetton { background: white; padding: 10px; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; align-items: center; }
    .jetton img { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; }
    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #1e90ff; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; display: inline-block; margin-left: 10px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h1>Simple TON Wallet</h1>
  <button id="connectBtn">Connect Wallet</button>
  <p id="address"></p>
  <div id="jettons"></div>

  <script>
    const client = new ton.TonClient({ endpoint: "https://toncenter.com/api/v2/jsonRPC" });
    const connectBtn = document.getElementById("connectBtn");
    const addressEl = document.getElementById("address");
    const jettonsEl = document.getElementById("jettons");

    const tonConnect = new TonConnect.TonConnect({ manifestUrl: "https://YOUR_GITHUB_USER.github.io/manifest.json" });

    tonConnect.onStatusChange(async (wallet) => {
      if(wallet) {
        addressEl.textContent = "Connected: " + wallet.account.address;
        await fetchJettons(wallet.account.address);
      } else {
        addressEl.textContent = "";
        jettonsEl.innerHTML = "";
      }
    });

    connectBtn.onclick = async () => {
      await tonConnect.connect();
    };

    async function fetchJettons(walletAddress) {
      jettonsEl.innerHTML = 'Loading<span class="spinner"></span>';
      try {
        const result = await client.callGetMethod(ton.Address.parse(walletAddress), "get_wallets");
        const wallets = result.stack.map(item => ({ master: item[0].toString(), wallet: item[1].toString() }));

        let html = "";
        for(const w of wallets) {
          try {
            const balanceRes = await client.callGetMethod(ton.Address.parse(w.wallet), "get_balance");
            const balance = BigInt(balanceRes.stack[0][1]) / 10n**9n;

            const metaRes = await client.callGetMethod(ton.Address.parse(w.master), "get_jetton_data");
            const name = bytesToString(metaRes.stack[0][1]);
            const symbol = bytesToString(metaRes.stack[1][1]);
            let logo;
            try {
              const logoCell = metaRes.stack[2][1];
              if(logoCell) logo = bytesToString(logoCell);
            } catch{}

            html += `<div class="jetton">
                      ${logo ? `<img src="${logo}" alt="${name}">` : `<div style="width:40px;height:40px;background:#ddd;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;margin-right:10px;">${symbol[0]}</div>`}
                      <div>
                        <strong>${name}</strong> (${symbol}): ${balance.toString()}
                      </div>
                    </div>`;
          } catch(e) {
            console.log("Error reading jetton", w.wallet, e);
          }
        }
        jettonsEl.innerHTML = html || "No Jettons found.";
      } catch(e) {
        jettonsEl.innerHTML = "Error fetching jettons.";
        console.error(e);
      }
    }

    function bytesToString(cellBase64) {
      try {
        const cell = ton.Cell.fromBoc(Uint8Array.from(atob(cellBase64), c => c.charCodeAt(0)))[0];
        const bytes = cell.beginParse().readRemainingBytes();
        return new TextDecoder().decode(bytes);
      } catch {
        return "";
      }
    }
  </script>
</body>
</html>
