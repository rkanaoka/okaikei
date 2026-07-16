"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const uuidv7_1 = require("uuidv7");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
function hashPwd(pwd) {
    return (0, crypto_1.createHash)('sha256').update(pwd).digest('hex');
}
async function main() {
    console.log('🌱  Seeding database…');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@bodogami.com.br' },
        update: {},
        create: {
            id: (0, uuidv7_1.uuidv7)(),
            name: 'Administrador',
            email: 'admin@bodogami.com.br',
            password: hashPwd('admin123'),
            role: 'ADMIN',
        },
    });
    await prisma.user.upsert({
        where: { email: 'garcom@bodogami.com.br' },
        update: {},
        create: {
            id: (0, uuidv7_1.uuidv7)(),
            name: 'Garçom Padrão',
            email: 'garcom@bodogami.com.br',
            password: hashPwd('garcom123'),
            role: 'WAITER',
        },
    });
    console.log(`  ✓ Users: admin (${admin.email}), garcom`);
    const tableLabels = [
        ...Array.from({ length: 8 }, (_, i) => `Mesa ${i + 1}`),
        'Balcão 1',
        'Delivery',
        ...Array.from({ length: 41 }, (_, i) => `Mesa ${i + 10}`),
        'Balcão 2',
        'Mesa Externa 1',
        'Mesa Externa 2',
    ];
    for (let i = 0; i < tableLabels.length; i++) {
        await prisma.table.upsert({
            where: { number: i + 1 },
            update: { label: tableLabels[i] },
            create: { id: (0, uuidv7_1.uuidv7)(), number: i + 1, label: tableLabels[i] },
        });
    }
    console.log(`  ✓ Tables: ${tableLabels.length} created`);
    const categoryNames = ['Prato Principal', 'Para Compartilhar', 'Lanches', 'Refrigerantes', 'Cervejas', 'Drinks Alcoólicos'];
    const existingCategoryNames = (await prisma.menuCategory.findMany({ select: { name: true } })).map(c => c.name);
    const categoriesToInsert = categoryNames.filter(n => !existingCategoryNames.includes(n));
    if (categoriesToInsert.length > 0) {
        await prisma.menuCategory.createMany({
            data: categoriesToInsert.map((name) => ({ id: (0, uuidv7_1.uuidv7)(), name, sortOrder: categoryNames.indexOf(name) })),
        });
    }
    console.log(`  ✓ Categorias do cardápio: ${categoryNames.length} (${categoriesToInsert.length} inseridas)`);
    const menuItems = [
        { name: 'Ramen Shoyu', category: 'kitchen', price: 42.00, description: 'Caldo de frango, chashu, ovo marinado, nori' },
        { name: 'Ramen Missô', category: 'kitchen', price: 44.00, description: 'Caldo de missô, porco desfiado, milho, manteiga' },
        { name: 'Ramen Tonkatsu', category: 'kitchen', price: 46.00, description: 'Caldo de osso de porco, chashu, funghi, cebolinha' },
        { name: 'Yakisoba Frango', category: 'kitchen', price: 36.00, description: 'Macarrão grelhado, frango, legumes' },
        { name: 'Yakisoba Camarão', category: 'kitchen', price: 42.00, description: 'Macarrão grelhado, camarão, legumes' },
        { name: 'Gyoza (6 un)', category: 'kitchen', price: 22.00, description: 'Pastel japonês grelhado, recheio de porco e legumes' },
        { name: 'Karaage', category: 'kitchen', price: 28.00, description: 'Frango frito estilo japonês, molho ponzu' },
        { name: 'Onigiri (2 un)', category: 'kitchen', price: 16.00, description: 'Bolinho de arroz, sabores da semana' },
        { name: 'Edamame', category: 'kitchen', price: 14.00, description: 'Soja no vapor com sal marinho' },
        { name: 'Cerveja Sapporo', category: 'bar', price: 18.00, description: 'Cerveja japonesa 600ml' },
        { name: 'Cerveja Asahi', category: 'bar', price: 16.00, description: 'Lager japonesa 350ml' },
        { name: 'Saquê Quente', category: 'bar', price: 24.00, description: 'Saquê Ozeki aquecido' },
        { name: 'Saquê Frio', category: 'bar', price: 24.00, description: 'Saquê Hakutsuru gelado' },
        { name: 'Chá Verde', category: 'bar', price: 10.00, description: 'Sencha ou matcha' },
        { name: 'Água Mineral', category: 'bar', price: 7.00, description: '500ml com ou sem gás' },
        { name: 'Refrigerante', category: 'bar', price: 10.00, description: 'Coca, Guaraná, Zero' },
        { name: 'Suco Yuzu', category: 'bar', price: 16.00, description: 'Suco natural de yuzu com mel' },
        { name: 'Mochi (2 un)', category: 'cashier', price: 14.00, description: 'Bolinho de arroz glutinoso, recheio surpresa' },
        { name: 'Dorayaki', category: 'cashier', price: 12.00, description: 'Panquecinha japonesa com anko' },
        { name: 'Taxa de Entrega', category: 'cashier', price: 8.00, description: 'Delivery — taxa fixa' },
    ];
    const existingNames = (await prisma.menuItem.findMany({ select: { name: true } })).map(i => i.name);
    const toInsert = menuItems.filter(m => !existingNames.includes(m.name));
    if (toInsert.length > 0) {
        await prisma.menuItem.createMany({
            data: toInsert.map(m => ({ id: (0, uuidv7_1.uuidv7)(), ...m, available: true })),
            skipDuplicates: true,
        });
    }
    console.log(`  ✓ Menu: ${menuItems.length} items (${toInsert.length} inseridos)`);
    const printers = [
        { category: 'kitchen', ip: process.env.PRINTER_KITCHEN_IP ?? '10.5.103.25', port: parseInt(process.env.PRINTER_PORT ?? '9100'), label: 'Cozinha — Beijing Spirit' },
        { category: 'bar', ip: process.env.PRINTER_BAR_IP ?? '10.5.103.26', port: parseInt(process.env.PRINTER_PORT ?? '9100'), label: 'Bar' },
        { category: 'cashier', ip: process.env.PRINTER_CASHIER_IP ?? '10.5.103.24', port: parseInt(process.env.PRINTER_PORT ?? '9100'), label: 'Caixa — Bematech' },
    ];
    for (const p of printers) {
        await prisma.printer.upsert({
            where: { category: p.category },
            update: { ip: p.ip },
            create: { id: (0, uuidv7_1.uuidv7)(), ...p, enabled: true },
        });
    }
    console.log(`  ✓ Printers: ${printers.length} configured`);
    const configs = [
        { key: 'restaurant_name', value: 'Bodogami' },
        { key: 'restaurant_cnpj', value: '00.000.000/0001-00' },
        { key: 'service_charge', value: 0 },
        { key: 'receipt_footer', value: 'Obrigado pela visita! @bodogami' },
        { key: 'print_on_add', value: true },
        { key: 'sync_enabled', value: true },
    ];
    for (const c of configs) {
        await prisma.systemConfig.upsert({
            where: { key: c.key },
            update: {},
            create: { key: c.key, value: c.value },
        });
    }
    console.log(`  ✓ System config: ${configs.length} keys`);
    const cancellationLabels = ['Duplicado', 'Saiu sem pagar', 'Cliente devolveu', 'Pedido teste'];
    const existingCancelLabels = (await prisma.cancellationReason.findMany({ select: { label: true } })).map(r => r.label);
    const cancelToInsert = cancellationLabels.filter(l => !existingCancelLabels.includes(l));
    if (cancelToInsert.length > 0) {
        await prisma.cancellationReason.createMany({
            data: cancelToInsert.map(label => ({ id: (0, uuidv7_1.uuidv7)(), label })),
        });
    }
    console.log(`  ✓ Motivos de cancelamento: ${cancellationLabels.length} (${cancelToInsert.length} inseridos)`);
    console.log('\n✅  Seed complete!');
    console.log('   Admin: admin@bodogami.com.br / admin123');
    console.log('   Garçom: garcom@bodogami.com.br / garcom123');
    console.log('   (Senhas com SHA-256 simples — use bcrypt em produção)');
}
main()
    .catch(e => { console.error('Seed error:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map