/**
 * Bodogami — Frente de Caixa Offline
 * Migration 2: Dados fictícios de cardápio (APENAS AMBIENTE DE TESTE)
 * Este arquivo não deve ser versionado — ver .gitignore
 */

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO items (name, description, price, category, subcategory, sort_order) VALUES
      -- Entradas
      ('Pão de Alho', 'Porção com 8 unidades, na manteiga de ervas', 12.90, 'cozinha', 'Entradas', 1),
      ('Bolinho de Bacalhau', 'Porção com 6 unidades', 24.90, 'cozinha', 'Entradas', 2),
      ('Batata Frita', 'Porção grande, acompanha molho especial', 19.90, 'cozinha', 'Entradas', 3),
      ('Isca de Frango a Passarinho', 'Porção com molho barbecue', 22.90, 'cozinha', 'Entradas', 4),
      ('Bruschetta de Tomate', '4 unidades com tomate, manjericão e parmesão', 16.90, 'cozinha', 'Entradas', 5),

      -- Pratos Principais
      ('Filé Mignon ao Molho Madeira', 'Acompanha arroz, batata rústica e legumes', 59.90, 'cozinha', 'Pratos Principais', 10),
      ('Frango à Parmegiana', 'Filé empanado, molho de tomate e queijo gratinado', 42.90, 'cozinha', 'Pratos Principais', 11),
      ('Picanha na Chapa', 'Serve 2 pessoas, acompanha vinagrete e farofa', 89.90, 'cozinha', 'Pratos Principais', 12),
      ('Salmão Grelhado', 'Acompanha legumes salteados e arroz de brócolis', 64.90, 'cozinha', 'Pratos Principais', 13),
      ('Risoto de Camarão', 'Risoto cremoso com camarões grandes', 54.90, 'cozinha', 'Pratos Principais', 14),
      ('Espaguete à Bolonhesa', 'Molho artesanal de carne moída', 38.90, 'cozinha', 'Pratos Principais', 15),
      ('Feijoada Completa', 'Servida aos sábados, acompanha couve e laranja', 49.90, 'cozinha', 'Pratos Principais', 16),

      -- Guarnições
      ('Arroz Branco', 'Porção individual', 8.90, 'cozinha', 'Guarnições', 20),
      ('Farofa', 'Porção individual', 7.90, 'cozinha', 'Guarnições', 21),
      ('Vinagrete', 'Porção individual', 5.90, 'cozinha', 'Guarnições', 22),

      -- Sobremesas
      ('Petit Gâteau', 'Acompanha sorvete de creme', 22.90, 'cozinha', 'Sobremesas', 30),
      ('Pudim de Leite', 'Fatia individual', 14.90, 'cozinha', 'Sobremesas', 31),
      ('Mousse de Maracujá', 'Taça individual', 13.90, 'cozinha', 'Sobremesas', 32),

      -- Bebidas
      ('Coca-Cola Lata', '350ml', 6.50, 'bar', 'Refrigerantes', 40),
      ('Guaraná Antarctica Lata', '350ml', 6.50, 'bar', 'Refrigerantes', 41),
      ('Suco de Laranja Natural', '400ml', 9.90, 'bar', 'Sucos', 42),
      ('Água Mineral com Gás', '500ml', 5.00, 'bar', 'Águas', 43),
      ('Água Mineral sem Gás', '500ml', 4.50, 'bar', 'Águas', 44),
      ('Cerveja Long Neck Heineken', '330ml', 12.90, 'bar', 'Cervejas', 45),
      ('Chopp Artesanal', '300ml', 14.90, 'bar', 'Cervejas', 46),
      ('Caipirinha de Limão', 'Cachaça, limão e açúcar', 22.90, 'bar', 'Drinks', 47),
      ('Mojito', 'Rum, hortelã, limão e água com gás', 26.90, 'bar', 'Drinks', 48),
      ('Café Expresso', 'Xícara pequena', 6.90, 'bar', 'Cafés', 49);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM items WHERE name IN (
      'Pão de Alho', 'Bolinho de Bacalhau', 'Batata Frita', 'Isca de Frango a Passarinho', 'Bruschetta de Tomate',
      'Filé Mignon ao Molho Madeira', 'Frango à Parmegiana', 'Picanha na Chapa', 'Salmão Grelhado',
      'Risoto de Camarão', 'Espaguete à Bolonhesa', 'Feijoada Completa',
      'Arroz Branco', 'Farofa', 'Vinagrete',
      'Petit Gâteau', 'Pudim de Leite', 'Mousse de Maracujá',
      'Coca-Cola Lata', 'Guaraná Antarctica Lata', 'Suco de Laranja Natural',
      'Água Mineral com Gás', 'Água Mineral sem Gás', 'Cerveja Long Neck Heineken', 'Chopp Artesanal',
      'Caipirinha de Limão', 'Mojito', 'Café Expresso'
    );
  `);
};
