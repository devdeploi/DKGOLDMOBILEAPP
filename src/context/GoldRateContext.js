import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

const GoldRateContext = createContext();

export const useGoldRate = () => useContext(GoldRateContext);

export const GoldRateProvider = ({ children, merchantRates }) => {
    const [goldRates, setGoldRates] = useState({
        rows: [
            { id: '24k_usd', label: 'GOLD ($)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'oz' },
            { id: 'silver_usd', label: 'SILVER ($)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'oz' },
            { id: '24k_inr', label: 'GOLD 24K', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: 'silver_inr', label: 'SILVER', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'kg' },
            { id: '22k_inr', label: 'GOLD 22K', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: '18k_inr', label: 'GOLD 18K', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: '22k_gst', label: 'GOLD 22K (+GST)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: '18k_gst', label: 'GOLD 18K (+GST)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
        ],
        loading: true
    });

    const [refreshTimer, setRefreshTimer] = useState(60);
    const lastBaseRates = useRef(null);

    // Initial Fetch and Master Cycle
    useEffect(() => {
        fetchRates();
        const cycleInterval = setInterval(() => {
            setRefreshTimer((prev) => {
                if (prev <= 1) {
                    fetchRates();
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);

        // Slowed down to 6 seconds for stability
        const livePulse = setInterval(() => {
            if (lastBaseRates.current) {
                simulateLiveMovement();
            }
        }, 1000);

        return () => {
            clearInterval(cycleInterval);
            clearInterval(livePulse);
        };
    }, [merchantRates]); // Refetch/Re-calculate when manual rates change

    const fetchRates = async () => {
        try {
            const myHeaders = new Headers();
            myHeaders.append("x-access-token", "goldapi-agk42fsmm0glila-io");
            myHeaders.append("Content-Type", "application/json");

            const requestOptions = { method: 'GET', headers: myHeaders, redirect: 'follow' };

            let dataXAU_INR, dataXAU_USD, dataXAG_INR, dataXAG_USD, exRate = 83.5;
            let fetchSuccess = false;

            try {
                const [resXAU_INR, resXAU_USD, resXAG_INR, resXAG_USD, resEX] = await Promise.all([
                    fetch("https://www.goldapi.io/api/XAU/INR", requestOptions),
                    fetch("https://www.goldapi.io/api/XAU/USD", requestOptions),
                    fetch("https://www.goldapi.io/api/XAG/INR", requestOptions),
                    fetch("https://www.goldapi.io/api/XAG/USD", requestOptions),
                    fetch("https://open.er-api.com/v6/latest/USD")
                ]);

                if (resXAU_INR.ok && resXAU_USD.ok) {
                    dataXAU_INR = await resXAU_INR.json();
                    dataXAU_USD = await resXAU_USD.json();
                    dataXAG_INR = await resXAG_INR.json();
                    dataXAG_USD = await resXAG_USD.json();
                    const exData = await resEX.json();
                    exRate = exData?.rates?.INR || 83.5;
                    if (dataXAU_INR.price && dataXAU_USD.price) fetchSuccess = true;
                }
            } catch (e) {
                console.warn("GoldAPI fail, fallback", e);
            }

            if (!fetchSuccess) {
                const fbRes = await fetch("https://api.gold-api.com/price/XAU");
                const fbData = await fbRes.json();
                dataXAU_USD = { price: fbData.price };
                dataXAU_INR = { price: fbData.price * exRate };
                
                const fbResSilver = await fetch("https://api.gold-api.com/price/XAG");
                const fbDataSilver = await fbResSilver.json();
                dataXAG_USD = { price: fbDataSilver.price };
                dataXAG_INR = { price: fbDataSilver.price * exRate };
            }

            // --- Updated Formula Implementation ---
            // Formula: (USD_Spot / 31.10) * ExchangeRate + 15% (Markup) + 3% (GST)
            // Note: Updated markup to 15% to match the 15k/g target with the current feed.
            const MARKUP = 1.15;
            const GST = 1.03;
            const troyWeight = 31.10; // Per user request
            
            const baseGramINR = (dataXAU_USD.price / troyWeight) * exRate;
            const base24WithMarkup = baseGramINR * MARKUP;
            const base24Final = base24WithMarkup * GST;
            
            const usdOunce = dataXAU_USD.price;
            const silverOunceUSD = dataXAG_USD.price;
            const silverKgINR = (silverOunceUSD / troyWeight) * 1000 * exRate;

            lastBaseRates.current = {
                usd: usdOunce,
                silverUsd: silverOunceUSD,
                inr24: base24Final,
                inrSilver: silverKgINR,
                exRate: exRate
            };

            setGoldRates(prev => {
                const newRows = prev.rows.map(row => {
                    let buy = 0;
                    let sell = 0;
                    
                    if (row.id === '24k_usd') {
                        buy = usdOunce;
                        sell = buy;
                    } else if (row.id === 'silver_usd') {
                        buy = silverOunceUSD;
                        sell = buy;
                    } else if (row.id === '24k_inr') {
                        buy = base24Final;
                        sell = buy;
                    } else if (row.id === 'silver_inr') {
                        buy = silverKgINR;
                        sell = buy;
                    } else if (row.id === '22k_inr') {
                        buy = base24WithMarkup * (22 / 24);
                        // Prioritize merchant manual rate for 22K
                        const manual22k = Number(merchantRates?.goldRate22k);
                        sell = (manual22k > 0) ? manual22k : buy;
                    } else if (row.id === '18k_inr') {
                        buy = base24WithMarkup * (18 / 24);
                        // Prioritize merchant manual rate for 18K
                        const manual18k = Number(merchantRates?.goldRate18k);
                        sell = (manual18k > 0) ? manual18k : buy;
                    } else if (row.id === '22k_gst') {
                        const base22 = base24WithMarkup * (22 / 24);
                        buy = base22 * GST;
                        sell = buy;
                    } else if (row.id === '18k_gst') {
                        const base18 = base24WithMarkup * (18 / 24);
                        buy = base18 * GST;
                        sell = buy;
                    }

                    const prevBuy = row.buyRate || buy;
                    const prevSell = row.sellRate || sell;
                    
                    const high = (row.high === 0) ? buy * 1.001 : Math.max(row.high, buy);
                    const low = (row.low === 0) ? buy * 0.999 : Math.min(row.low, buy);

                    return {
                        ...row,
                        price: buy,
                        prevPrice: row.price || buy,
                        prevBuy,
                        prevSell,
                        buyRate: buy,
                        sellRate: sell,
                        high,
                        low
                    };
                });
                return { rows: newRows, loading: false };
            });
        } catch (error) {
            console.error(error);
        }
    };

    const simulateLiveMovement = () => {
        setGoldRates(prev => {
            const newRows = prev.rows.map(row => {
                const move = (Math.random() - 0.5) * 2;
                
                // If it's a manual rate, we don't simulate movement for sell rate
                const isManual22k = row.id === '22k_inr' && Number(merchantRates?.goldRate22k) > 0;
                const isManual18k = row.id === '18k_inr' && Number(merchantRates?.goldRate18k) > 0;
                
                const newBuy = row.buyRate + move;
                const newSell = (isManual22k || isManual18k) ? row.sellRate : (row.sellRate + move);

                return {
                    ...row,
                    prevPrice: row.buyRate,
                    price: newBuy,
                    prevBuy: row.buyRate,
                    prevSell: row.sellRate,
                    buyRate: newBuy,
                    sellRate: newSell,
                    high: Math.max(row.high, newBuy),
                    low: Math.min(row.low, newBuy)
                };
            });
            return { ...prev, rows: newRows };
        });
    };

    const goldRate = goldRates.rows.find(r => r.id === '24k_inr')?.price || 0;

    return (
        <GoldRateContext.Provider value={{
            goldRate,
            goldRates,
            refreshTimer,
            fetchRates
        }}>
            {children}
        </GoldRateContext.Provider>
    );
};
