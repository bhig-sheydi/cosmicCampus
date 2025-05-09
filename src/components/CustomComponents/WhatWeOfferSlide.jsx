"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

const WhatWeOfferSlide = ({ services }) => {
    const [index, setIndex] = useState(0);
    const [text, setText] = useState("");
    const [descText, setDescText] = useState("");
    const [isTyping, setIsTyping] = useState(true);
    const [isTypingDesc, setIsTypingDesc] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const typingSpeed = 80;
    const deleteSpeed = 50;

    useEffect(() => {
        if (isPaused) return;
        let timeout;
        const fullText = services[index].name;
        const fullDesc = services[index].description;

        if (isTyping) {
            if (text.length < fullText.length) {
                timeout = setTimeout(() => {
                    setText(fullText.slice(0, text.length + 1));
                }, typingSpeed);
            } else {
                setTimeout(() => {
                    setIsTyping(false);
                    setIsTypingDesc(true);
                }, 1000);
            }
        } else if (isTypingDesc) {
            if (descText.length < fullDesc.length) {
                timeout = setTimeout(() => {
                    setDescText(fullDesc.slice(0, descText.length + 1));
                }, typingSpeed);
            } else {
                setTimeout(() => {
                    setIsTypingDesc(false);
                }, 2000);
            }
        } else {
            if (descText.length > 0) {
                timeout = setTimeout(() => {
                    setDescText(descText.slice(0, -1));
                }, deleteSpeed);
            } else if (text.length > 0) {
                timeout = setTimeout(() => {
                    setText(text.slice(0, -1));
                }, deleteSpeed);
            } else {
                setIndex((prev) => (prev + 1) % services.length);
                setIsTyping(true);
            }
        }

        return () => clearTimeout(timeout);
    }, [text, descText, isTyping, isTypingDesc, index, isPaused]);

    return (
        <div 
            className="relative  flex flex-col items-center justify-center w-screen h-screen "
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
                        <div>
                <h1 className="text-4xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"> About Us</h1>
            </div>
            <h1 className="text-3xl border-none pt-0.5 font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                What We Offer
            </h1>
            <Card className="relative w-full max-w-xl p-8 rounded-2xl shadow-xl bg-opacity-90">
                <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                    <h2 className="text-2xl font-bold text-purple-500">{text}</h2>
                    {descText && (
                        <p className="text-lg text-gray-800 dark:text-gray-200">{descText}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WhatWeOfferSlide;
