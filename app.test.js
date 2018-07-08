const request = require('supertest'); // eslint-disable-line import/no-extraneous-dependencies
const expect = require('expect'); // eslint-disable-line import/no-extraneous-dependencies

const app = require('./app');
const TestQuery = require('./middleware/testQuery');

const location = 'Brands Test';

const brands = [{ name: 'DrHilo' }, { name: 'Mayasem' }, { name: 'Others' }];

let categories;

beforeEach((done) => { 
    TestQuery(location, 'DELETE FROM brands', () => {
        TestQuery(location, 
            `INSERT INTO brands 
            (name) 
            values 
            ('${brands[0].name}'), ('${brands[1].name}'), ('${brands[2].name}')
            `
        , result => {
            brands[0].id = result.insertId;
            brands[1].id = result.insertId + 1;
            brands[2].id = result.insertId + 2;
            
            categories = [
                { name: 'category1', image: 'image1', brand_id: brands[0].id }, 
                { name: 'category2', image: 'image2', brand_id: brands[1].id },
                { name: 'category3', image: 'image3', brand_id: brands[2].id }
                
            ];

            TestQuery(location, 'DELETE FROM categories', () => {
                TestQuery(location, 
                    `INSERT INTO categories 
                    (name, image, brand_id) 
                    values 
                ('${categories[0].name}', '${categories[0].image}', '${categories[0].brand_id}'),
                ('${categories[1].name}', '${categories[1].image}', '${categories[1].brand_id}'),
                ('${categories[2].name}', '${categories[2].image}', '${categories[2].brand_id}')
                    `
                , result => { //eslint-disable-line
                    categories[0].id = result.insertId;
                    categories[1].id = result.insertId + 1;
                    done();
                });
            });
        });
    }); 
});

describe('Routes', () => { 
    describe('Brands', () => {
        describe('Get /', () => {
            it('should get all brands', (done) => {
                request(app)
                    .get('/brands')
                    .expect(200)
                    .expect(res => {
                        expect(res.body).toContainEqual(brands[0], brands[1], brands[2]);
                    })
                    .end(done);
            });
        });
    });
    
    describe('Categories', () => {
        describe('Get /', () => {
            it('should get all categories', (done) => {
                request(app)
                    .get('/categories')
                    .expect(200)
                    .expect(res => {
                        expect(res.body[`${brands[0].name}Categories`])
                            .toContainEqual(categories[0], categories[1]);
                    })
                    .end(done);
            });
        });
    });
});
