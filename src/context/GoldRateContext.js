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
        exRate: 95.5,
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
                const m24 = Number(merchantRates.goldRate24k);
                const mSil = Number(merchantRates.silverRate);

                if (row.id === '22k_inr' && m22 > 0) updatedSell = m22;
                else if (row.id === '18k_inr' && m18 > 0) updatedSell = m18;
                else if (row.id === '24k_inr' && m24 > 0) updatedSell = m24;
                else if (row.id === 'silver_inr' && mSil > 0) updatedSell = mSil;
                else if (row.id === '22k_gst' && m22 > 0) updatedSell = m22 * 1.03;
                else if (row.id === '18k_gst' && m18 > 0) updatedSell = m18 * 1.03;

                return { ...row, sellRate: updatedSell };
            });
            return { ...prev, rows: newRows };
        });
    };

    console.log("Gold rates : ", goldRates);


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
            let dataXAU_INR = { price: 0 }, dataXAU_USD = { price: 0 }, dataXAG_INR = { price: 0 }, dataXAG_USD = { price: 0 }, exRate = 95.5;
            let fetchSuccess = false;

            // 1. Fetch Exchange Rate with Multi-Source Accuracy
            try {
                // Priority 1: Yahoo Finance
                const resYahoo = await fetch("https://query2.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1m&range=1d");
                if (resYahoo.ok) {
                    const yahooData = await resYahoo.json();
                    const latestPrice = yahooData?.chart?.result?.[0]?.meta?.regularMarketPrice;
                    if (latestPrice) {
                        exRate = latestPrice;
                        fetchSuccess = true;
                        console.log("EX Rate (Yahoo) fetched:", exRate);
                    }
                }

                // Priority 2: Alternative Free Feed
                if (!fetchSuccess) {
                    const resAlt = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
                    if (resAlt.ok) {
                        const altData = await resAlt.json();
                        exRate = altData?.rates?.INR || exRate;
                        fetchSuccess = true;
                    }
                }
            } catch (e) {
                console.warn("EX fetch failed, using default", e);
            }

            // 2. Fetch Gold Prices (Keyless Sources)
            try {
                // Priority 1: Gold-API.com (Free & Keyless)
                const [resXAU, resXAG] = await Promise.all([
                    fetch("https://api.gold-api.com/price/XAU"),
                    fetch("https://api.gold-api.com/price/XAG")
                ]);

                if (resXAU.ok && resXAG.ok) {
                    const gData = await resXAU.json();
                    const sData = await resXAG.json();
                    if (gData.price) {
                        dataXAU_USD = { price: gData.price };
                        dataXAG_USD = { price: sData.price };
                        fetchSuccess = true;
                        console.log("Gold/Silver Prices (Free API) fetched");
                    }
                }

                // Priority 2: Binance PAXG (Proxy for Gold Price - Free & Keyless)
                if (!fetchSuccess) {
                    const resBinance = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT");
                    if (resBinance.ok) {
                        const bData = await resBinance.json();
                        if (bData.price) {
                            dataXAU_USD = { price: parseFloat(bData.price) };
                            fetchSuccess = true;
                        }
                    }
                }
            } catch (e) {
                console.warn("Free Gold APIs failed", e);
            }

            if (!fetchSuccess) {
                console.warn("All live prices failed. Using last known or zero.");
            }

            // --- Updated Formula Implementation for Physical Gold (India) ---
            const MARKUP = 1.125; 
            const GST = 1.03;    
            const troyWeight = 31.10; 

            const usdOunce = dataXAU_USD.price || 0;
            const silverOunceUSD = dataXAG_USD.price || 0;
            const baseGramINR = (usdOunce / troyWeight) * exRate;
            const base24Final = baseGramINR * MARKUP * GST;
            const silverKgINR = (silverOunceUSD / troyWeight) * 1000 * exRate * MARKUP * GST;

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

                    if (row.id === '24k_usd') {
                        const manual24k = Number(manualRatesRef.current?.goldRate24k);
                        buy = sell = (manual24k > 0) ? (manual24k / exRate / (MARKUP * GST) * troyWeight) : usdOunce;
                    }
                    else if (row.id === 'silver_usd') {
                        const manualSilver = Number(manualRatesRef.current?.silverRate);
                        buy = sell = (manualSilver > 0) ? (manualSilver / exRate / 1000 * troyWeight) : silverOunceUSD;
                    }
                    else if (row.id === 'usd_inr') buy = sell = exRate;
                    else if (row.id === '24k_inr') {
                        buy = base24Final;
                        const manual24k = Number(manualRatesRef.current?.goldRate24k);
                        sell = (manual24k > 0) ? manual24k : buy;
                    }
                    else if (row.id === 'silver_inr') {
                        buy = silverKgINR;
                        const manualSilver = Number(manualRatesRef.current?.silverRate);
                        sell = (manualSilver > 0) ? manualSilver : buy;
                    }
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
                const m24 = Number(manualRatesRef.current?.goldRate24k);
                const mSil = Number(manualRatesRef.current?.silverRate);

                const isManual = (row.id.includes('22k') && m22 > 0) || (row.id.includes('18k') && m18 > 0) || (row.id.includes('24k') && m24 > 0) || (row.id.includes('silver') && mSil > 0);

                const newBuy = Math.max(0.01, row.buyRate + move);
                const newSell = isManual ? row.sellRate : Math.max(0.01, row.sellRate + move);

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
