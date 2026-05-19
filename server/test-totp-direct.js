import { generateSecret, generate, verify } from 'otplib';

async function test() {
    try {
        const secret = await generateSecret(); // async?
        const token = await generate({ secret });
        const result = await verify({ token, secret, window: 1 });
        console.log("verify result object:", result);
        console.log("typeof result:", typeof result);
    } catch(err) {
        console.error(err);
    }
}
test();
