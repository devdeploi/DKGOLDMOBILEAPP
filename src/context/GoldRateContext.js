import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

const GoldRateContext = createContext();

export const useGoldRate = () => useContext(GoldRateContext);

export const GoldRateProvider = ({ children, merchantRates }) => {
    const [goldRates, setGoldRates] = useState({
        rows: [
            { id: '24k_usd', label: 'GOLD ($)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'oz' },
            { id: 'silver_usd', label: 'SILVER ($)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'oz' },
            { id: 'usd_inr', label: 'USD / INR', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: '₹' },
            { id: '24k_inr', label: 'GOLD 24K', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: 'silver_inr', label: 'SILVER', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'kg' },
            { id: '22k_inr', label: 'GOLD 22K', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: '18k_inr', label: 'GOLD 18K', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: '22k_gst', label: 'GOLD 22K (+GST)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: '18k_gst', label: 'GOLD 18K (+GST)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
        ],
        exRate: 83.5,
        loading: true
    });

    const [refreshTimer, setRefreshTimer] = useState(60);
    const lastBaseRates = useRef(null);
    const manualRatesRef = useRef(merchantRates);

    // Keep ref synced for non-reactive access in intervals
    useEffect(() => {
        manualRatesRef.current = merchantRates;
        // Force an immediate update of current rates when manual rates change
        applyManualRates();
    }, [merchantRates]);

    const applyManualRates = () => {
        if (!merchantRates) return;
        setGoldRates(prev => {
            const newRows = prev.rows.map(row => {
                let updatedSell = row.sellRate;
                const m22 = Number(merchantRates.goldRate22k);
                const m18 = Number(merchantRates.goldRate18k);

                if (row.id === '22k_inr' && m22 > 0) updatedSell = m22;
                else if (row.id === '18k_inr' && m18 > 0) updatedSell = m18;
                else if (row.id === '22k_gst' && m22 > 0) updatedSell = m22 * 1.03;
                else if (row.id === '18k_gst' && m18 > 0) updatedSell = m18 * 1.03;

                return { ...row, sellRate: updatedSell };
            });
            return { ...prev, rows: newRows };
        });
    };

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
        // Check if market is open based on IST (Approx)
        const isMarketOpen = () => {
            const now = new Date();
            const day = now.getDay();
            const hour = now.getHours();
            const min = now.getMinutes();
            const timeVal = hour * 100 + min;

            const isWeekend = day === 0 || day === 6;
            if (isWeekend) return false;

            // MCX Timing: 10:00 AM - 11:30 PM (Standard)
            const openTime = 1000;
            const closeTime = 2330;
            
            return timeVal >= openTime && timeVal <= closeTime;
        };

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

            // 1. Fetch Exchange Rate with Fallback
            try {
                const resEX = await fetch("https://open.er-api.com/v6/latest/USD");
                if (resEX.ok) {
                    const exData = await resEX.json();
                    exRate = exData?.rates?.INR || 83.5;
                } else {
                    throw new Error("Primary EX fail");
                }
            } catch (e) {
                try {
                    const resEX2 = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
                    const exData2 = await resEX2.json();
                    exRate = exData2?.rates?.INR || 83.5;
                } catch (e2) {
                    console.warn("All EX APIs failed, using default 83.5");
                }
            }

            // 2. Fetch Gold Prices
            try {
                const [resXAU_INR, resXAU_USD, resXAG_INR, resXAG_USD] = await Promise.all([
                    fetch("https://www.goldapi.io/api/XAU/INR", requestOptions),
                    fetch("https://www.goldapi.io/api/XAU/USD", requestOptions),
                    fetch("https://www.goldapi.io/api/XAG/INR", requestOptions),
                    fetch("https://www.goldapi.io/api/XAG/USD", requestOptions),
                ]);

                if (resXAU_INR.ok && resXAU_USD.ok) {
                    dataXAU_INR = await resXAU_INR.json();
                    dataXAU_USD = await resXAU_USD.json();
                    dataXAG_INR = await resXAG_INR.json();
                    dataXAG_USD = await resXAG_USD.json();
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
            const MARKUP = 1.06; // 6% Premium/Import Duty
            const GST = 1.03; // 3% GST
            const troyWeight = 31.10; // Grams per troy ounce // Per user request

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
                    let buy = 0, sell = 0;

                    if (row.id === '24k_usd') buy = sell = usdOunce;
                    else if (row.id === 'silver_usd') buy = sell = silverOunceUSD;
                    else if (row.id === 'usd_inr') buy = sell = exRate;
                    else if (row.id === '24k_inr') buy = sell = base24Final;
                    else if (row.id === 'silver_inr') buy = sell = silverKgINR;
                    else if (row.id === '22k_inr') {
                        buy = (usdOunce / troyWeight) * exRate * MARKUP * (22 / 24);
                        const manual22k = Number(manualRatesRef.current?.goldRate22k);
                        sell = (manual22k > 0) ? manual22k : buy;
                    } else if (row.id === '18k_inr') {
                        buy = (usdOunce / troyWeight) * exRate * MARKUP * (18 / 24);
                        const manual18k = Number(manualRatesRef.current?.goldRate18k);
                        sell = (manual18k > 0) ? manual18k : buy;
                    } else if (row.id === '22k_gst') {
                        const manual22k = Number(manualRatesRef.current?.goldRate22k);
                        const base22 = (manual22k > 0) ? manual22k : (usdOunce / troyWeight) * exRate * MARKUP * (22 / 24);
                        buy = sell = base22 * GST;
                    } else if (row.id === '18k_gst') {
                        const manual18k = Number(manualRatesRef.current?.goldRate18k);
                        const base18 = (manual18k > 0) ? manual18k : (usdOunce / troyWeight) * exRate * MARKUP * (18 / 24);
                        buy = sell = base18 * GST;
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
                // Stability scale: USD/INR moves very little, commodities move more
                const volatility = row.id === 'usd_inr' ? 0.02 : 10;
                const move = (Math.random() - 0.5) * volatility; 

                const m22 = Number(manualRatesRef.current?.goldRate22k);
                const m18 = Number(manualRatesRef.current?.goldRate18k);

                const isManual = (row.id.includes('22k') && m22 > 0) || (row.id.includes('18k') && m18 > 0);

                const newBuy = row.buyRate + move;
                const newSell = isManual ? row.sellRate : (row.sellRate + move);

                return {
                    ...row,
                    prevPrice: row.price,
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
            exRate: goldRates.exRate,
            refreshTimer,
            fetchRates
        }}>
            {children}
        </GoldRateContext.Provider>
    );
};
