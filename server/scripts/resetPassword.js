import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

/**
 * Script to reset a user's password
 * Usage: node scripts/resetPassword.js <email> <newPassword>
 */

const resetPassword = async () => {
    try {
        const email = process.argv[2];
        const newPassword = process.argv[3];

        if (!email || !newPassword) {
            console.error('❌ Usage: node scripts/resetPassword.js <email> <newPassword>');
            process.exit(1);
        }

        // Find user
        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            console.error(`❌ User with email "${email}" not found`);
            process.exit(1);
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                isActive: true,
                isVerified: true,
                mustChangePassword: false,
                resetPasswordToken: null,
                resetPasswordExpire: null
            }
        });

        console.log('✅ Password reset successful!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log(`👤 User: ${user.name}`);
        console.log(`🏢 Role: ${user.role}`);
        console.log(`✓ User activated and verified`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
};

resetPassword();
