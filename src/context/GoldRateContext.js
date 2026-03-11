import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

const GoldRateContext = createContext();

export const useGoldRate = () => useContext(GoldRateContext);

export const GoldRateProvider = ({ children }) => {
    const [goldRates, setGoldRates] = useState({
        rows: [
            { id: '24k_usd', label: 'GOLD ($)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'oz' },
            { id: '24k_inr', label: 'GOLD 24K', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: '22k_inr', label: 'GOLD 22K', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: '18k_inr', label: 'GOLD 18K', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: 'gm' },
            { id: '22k_1pound', label: 'GOLD 22K (1 POUND)', price: 0, prevPrice: 0, buyRate: 0, sellRate: 0, prevBuy: 0, prevSell: 0, high: 0, low: 0, unit: '8gm' },
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
    }, []);

    const fetchRates = async () => {
        try {
            const myHeaders = new Headers();
            myHeaders.append("x-access-token", "goldapi-agk42fsmm0glila-io");
            myHeaders.append("Content-Type", "application/json");

            const requestOptions = { method: 'GET', headers: myHeaders, redirect: 'follow' };

            let dataINR, dataUSD, exRate = 83.5;
            let fetchSuccess = false;

            try {
                const [resINR, resUSD, resEX] = await Promise.all([
                    fetch("https://www.goldapi.io/api/XAU/INR", requestOptions),
                    fetch("https://www.goldapi.io/api/XAU/USD", requestOptions),
                    fetch("https://open.er-api.com/v6/latest/USD")
                ]);

                if (resINR.ok && resUSD.ok) {
                    dataINR = await resINR.json();
                    dataUSD = await resUSD.json();
                    const exData = await resEX.json();
                    exRate = exData?.rates?.INR || 83.5;
                    if (dataINR.price && dataUSD.price) fetchSuccess = true;
                }
            } catch (e) {
                console.warn("GoldAPI fail, fallback", e);
            }

            if (!fetchSuccess) {
                const fbRes = await fetch("https://api.gold-api.com/price/XAU");
                const fbData = await fbRes.json();
                dataUSD = { price: fbData.price };
                dataINR = { price: fbData.price * exRate };
            }

            const CHENNAI_MULTIPLIER = 1.1845;
            const base24 = (dataINR.price / 31.1035) * CHENNAI_MULTIPLIER;
            const usdOunce = dataUSD.price;

            lastBaseRates.current = {
                usd: usdOunce,
                inr24: base24
            };

            setGoldRates(prev => {
                const newRows = prev.rows.map(row => {
                    let buy = 0;
                    let sell = 0;
                    
                    if (row.id === '24k_usd') {
                        buy = (base24 / (exRate * 1.1845)) * 31.1035;
                        sell = buy * 1.001;
                    } else if (row.id === '24k_inr') {
                        buy = base24;
                        sell = base24 * 1.02;
                    } else if (row.id === '22k_inr') {
                        buy = base24 * (22 / 24);
                        sell = buy * 1.02;
                    } else if (row.id === '18k_inr') {
                        buy = base24 * (18 / 24);
                        sell = buy * 1.02;
                    } else if (row.id === '22k_1pound') {
                        buy = base24 * (22 / 24) * 8;
                        sell = buy * 1.02;
                    } else if (row.id === '22k_10pound') {
                        buy = base24 * (22 / 24) * 80;
                        sell = buy * 1.02;
                    }

                    const prevBuy = row.buyRate || buy;
                    const prevSell = row.sellRate || sell;
                    
                    const high = (row.high === 0) ? buy * 1.01 : Math.max(row.high, buy);
                    const low = (row.low === 0) ? buy * 0.99 : Math.min(row.low, buy);

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
                return {
                    ...row,
                    prevPrice: row.buyRate,
                    price: row.buyRate + move,
                    prevBuy: row.buyRate,
                    prevSell: row.sellRate,
                    buyRate: row.buyRate + move,
                    sellRate: row.sellRate + move,
                    high: Math.max(row.high, row.buyRate + move),
                    low: Math.min(row.low, row.buyRate + move)
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
