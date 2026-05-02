require('dotenv').config();
const supabase = require('./db/supabase');

async function testConnection() {
  console.log('🔄 Testing Supabase connection...\n');
  
  try {
    // Test 1: Fetch handover cases
    console.log('Test 1: Fetching handover cases...');
    const { data: cases, error: casesError } = await supabase
      .from('handover_cases')
      .select('*')
      .limit(10);
    
    if (casesError) throw casesError;
    
    console.log(`✅ Success! Found ${cases.length} cases`);
    if (cases.length > 0) {
      console.log('📊 Sample data:');
      console.log(JSON.stringify(cases[0], null, 2));
    }
    console.log('');
    
    // Test 2: Insert a test case
    console.log('Test 2: Inserting test case...');
    const testUnitId = `TEST-UNIT-${Date.now()}`;
    const { data: newCase, error: insertError } = await supabase
      .from('handover_cases')
      .insert({
        unit_id: testUnitId,
        customer_id: `TEST-CUST-${Date.now()}`,
        overall_status: 'pending'
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    console.log('✅ Test case inserted successfully!');
    console.log('📝 New case:', {
      id: newCase.id,
      unit_id: newCase.unit_id,
      customer_id: newCase.customer_id,
      overall_status: newCase.overall_status
    });
    console.log('');
    
    // Test 3: Update the test case
    console.log('Test 3: Updating test case...');
    const { data: updatedCase, error: updateError } = await supabase
      .from('handover_cases')
      .update({ 
        contract_status: 'drafted',
        contract_received_at: new Date().toISOString(),
        overall_status: 'pending'
      })
      .eq('id', newCase.id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    console.log('✅ Test case updated successfully!');
    console.log('📝 Updated status:', updatedCase.contract_status);
    console.log('');
    
    // Test 4: Insert event
    console.log('Test 4: Inserting event...');
    const { data: newEvent, error: eventError } = await supabase
      .from('handover_events')
      .insert({
        case_id: newCase.id,
        event_type: 'contract.drafted',
        event_source: 'legal',
        payload: {
          unitId: newCase.unit_id,
          customerId: newCase.customer_id,
          contractStatus: 'drafted',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (eventError) throw eventError;
    
    console.log('✅ Event inserted successfully!');
    console.log('📝 Event:', {
      id: newEvent.id,
      event_type: newEvent.event_type,
      event_source: newEvent.event_source
    });
    console.log('');
    
    // Test 5: Fetch events for case
    console.log('Test 5: Fetching events for case...');
    const { data: events, error: eventsError } = await supabase
      .from('handover_events')
      .select('*')
      .eq('case_id', newCase.id);
    
    if (eventsError) throw eventsError;
    
    console.log(`✅ Found ${events.length} event(s) for the case`);
    console.log('');
    
    console.log('🎉 All tests passed! Supabase is ready to use.');
    console.log('\n📋 Summary:');
    console.log(`   - Total cases: ${cases.length + 1}`);
    console.log(`   - Test case created: ${testUnitId}`);
    console.log(`   - Events logged: ${events.length}`);
    console.log('\n✅ You can now start the backend server with: npm start\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n💡 Make sure:');
    console.error('   1. .env file exists with correct SUPABASE_URL and SUPABASE_SECRET_KEY');
    console.error('   2. Tables are created in Supabase (run SQL from plan)');
    console.error('   3. API keys are correct\n');
    process.exit(1);
  }
}

testConnection();
